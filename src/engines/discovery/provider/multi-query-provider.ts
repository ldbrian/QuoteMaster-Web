import { DiscoveryProvider } from "./discovery-provider";
import { DiscoveryInput, DiscoveryResult, CandidateCompany } from "../models/discovery-types";
import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";
import { runWithConcurrencyLimit } from "@/src/utils/concurrency";

function extractCompanyName(title: string, url: string): string {
  try {
    const domain = new URL(url).hostname
      .replace(/^www\./, "")
      .replace(/\.com$/, "")
      .replace(/\.co\.\w+$/, "")
      .replace(/\.\w+$/, "");
    const fromDomain = domain
      .split(/[-.]+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");

    const cleaned = title
      .replace(/\s*[|]\s*.*$/, "")
      .replace(/\s*[-–—]\s*.*$/, "")
      .replace(/\s+Official\s+Website.*$/i, "")
      .replace(/\s+Home\s*$/i, "")
      .trim();

    const fromTitle = cleaned.replace(/\s+(Inc|Ltd|LLC|GmbH|Co\.?|Corp|Limited|Company)$/i, "").trim();

    if (fromTitle.length > fromDomain.length && fromTitle.length < 60) return fromTitle;
    if (fromDomain.length > 2 && fromDomain.length < 40) return fromDomain;
    return cleaned.slice(0, 60);
  } catch {
    return title.slice(0, 60);
  }
}

const QUERY_EXPANSION_PROMPT = `你是一个外贸客户开发专家。根据用户输入的关键词，生成 6 条不同的搜索查询，用于在搜索引擎中寻找潜在客户。

规则：
- 每条查询必须从不同角度覆盖用户的关键词
- 角度包括：行业术语、采购角色（importer/distributor/wholesaler/buyer）、地区、产品品类、商业模式（OEM/ODM）
- 查询用英文，因为搜索引擎索引英文内容最全面
- 每条查询最后加上 "company" 以确保返回公司结果

返回 JSON 数组格式：
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6"]`;

const MAX_QUERIES = 6;
const RESULTS_PER_QUERY = 10;
const MAX_RESULTS = 25;

export class MultiQueryProvider implements DiscoveryProvider {
  readonly name = "deep-search";

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error("BRAVE_API_KEY not configured");
    }

    const keywords = [
      ...(input.icp?.industries || []),
      ...(input.icp?.regions || []),
      ...(input.keywords || []),
    ];

    if (!keywords.length) {
      return { candidates: [], totalFound: 0, provider: this.name };
    }

    const queries = await this.expandQueries(keywords);
    const allItems: { title: string; url: string; description: string; query: string }[] = [];

    await runWithConcurrencyLimit(queries.slice(0, MAX_QUERIES), 3, async (query) => {
      try {
        const items = await this.searchBrave(query, apiKey);
        allItems.push(...items);
      } catch (e) {
        console.warn(`MultiQueryProvider: query "${query}" failed:`, e instanceof Error ? e.message : e);
      }
    });

    const seen = new Set<string>();
    const candidates: CandidateCompany[] = [];

    for (const item of allItems) {
      const companyName = extractCompanyName(item.title, item.url);
      const key = companyName.toLowerCase().replace(/\s+/g, "");
      if (seen.has(key) || !companyName || companyName.length < 2) continue;
      seen.add(key);

      const snippet = (item.description || "").toLowerCase();
      const matchedKeywords = keywords.filter((kw) =>
        snippet.includes(kw.toLowerCase()) || companyName.toLowerCase().includes(kw.toLowerCase())
      );

      candidates.push({
        companyName,
        website: item.url || undefined,
        confidence: Math.min(30 + matchedKeywords.length * 15, 90),
        matchReasons: matchedKeywords.length > 0
          ? [`匹配关键词: ${matchedKeywords.join(", ")}`]
          : ["Brave 搜索结果"],
        source: "Brave Search",
      });

      if (candidates.length >= MAX_RESULTS) break;
    }

    return { candidates, totalFound: candidates.length, provider: this.name };
  }

  private async expandQueries(keywords: string[]): Promise<string[]> {
    const input = keywords.join(", ");
    try {
      const content = await callDeepSeek(QUERY_EXPANSION_PROMPT, input, {
        responseFormat: "json_object",
        temperature: 0.7,
      });
      const parsed = JSON.parse(cleanJsonResponse(content));
      return Array.isArray(parsed) ? parsed.slice(0, MAX_QUERIES) : [];
    } catch (e) {
      console.warn("MultiQueryProvider: query expansion failed, falling back to single query", e);
      return [keywords.join(" ") + " company"];
    }
  }

  private async searchBrave(
    query: string,
    apiKey: string
  ): Promise<{ title: string; url: string; description: string; query: string }[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(RESULTS_PER_QUERY));

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brave Search API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const items: any[] = data?.web?.results || [];

    return items.map((item) => ({
      title: item.title || "",
      url: item.url || "",
      description: item.description || "",
      query,
    }));
  }
}
