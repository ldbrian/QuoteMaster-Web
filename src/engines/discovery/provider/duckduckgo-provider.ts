import { DiscoveryProvider } from "./discovery-provider";
import { DiscoveryInput, DiscoveryResult, CandidateCompany } from "../models/discovery-types";
import { execSync } from "child_process";

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

function parseDdgResults(html: string): { title: string; url: string; description: string }[] {
  const results: { title: string; url: string; description: string }[] = [];

  // Split by result blocks
  const blocks = html.split(/<div class="result results_links results_links_deep web-result /);

  // First item is before the first result, skip it
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    // Take up to nav-link or next result
    const endIdx = block.indexOf('<div class="nav-link');
    const content = endIdx > -1 ? block.slice(0, endIdx) : block;

    const titleMatch = content.match(/<a rel="nofollow" class="result__a" href="([^"]*)">([\s\S]*?)<\/a>/);
    const snippetMatch = content.match(/<a class="result__snippet"[\s\S]*?href="([^"]*)">([\s\S]*?)<\/a>/);

    if (!titleMatch) continue;

    const url = titleMatch[1];
    const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
    const description = snippetMatch ? snippetMatch[2].replace(/<[^>]+>/g, "").trim() : "";

    if (title && url) {
      results.push({ title, url, description });
    }
  }

  return results;
}

async function searchDdgViaPowershell(query: string): Promise<string> {
  const psScript = `[Console]::OutputEncoding = [Text.Encoding]::UTF8; \$r = Invoke-WebRequest -Uri 'https://html.duckduckgo.com/html/' -Method POST -Body @{q="${query}"} -UseBasicParsing -TimeoutSec 15; [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(\$r.Content))`;
  const result = execSync(
    `powershell -NoLogo -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
    { timeout: 25000, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
  );
  return Buffer.from(result.trim(), "base64").toString("utf-8");
}

export class DuckDuckGoProvider implements DiscoveryProvider {
  readonly name = "duckduckgo";

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const keywords = [
      ...(input.icp?.industries || []),
      ...(input.icp?.regions || []),
      ...(input.keywords || []),
    ];

    const query = keywords.join(" ").trim();
    if (!query) {
      return { candidates: [], totalFound: 0, provider: this.name };
    }

    const html = await searchDdgViaPowershell(query);
    const items = parseDdgResults(html);

    const seen = new Set<string>();
    const candidates: CandidateCompany[] = [];

    for (const item of items) {
      const companyName = extractCompanyName(item.title, item.url);
      const key = companyName.toLowerCase().replace(/\s+/g, "");
      if (seen.has(key) || !companyName || companyName.length < 2) continue;
      seen.add(key);

      const snippet = item.description.toLowerCase();
      const matchedKeywords = keywords.filter((kw) =>
        snippet.includes(kw.toLowerCase()) || companyName.toLowerCase().includes(kw.toLowerCase())
      );

      candidates.push({
        companyName,
        website: item.url,
        confidence: Math.min(30 + matchedKeywords.length * 15, 90),
        matchReasons: matchedKeywords.length > 0
          ? [`匹配关键词: ${matchedKeywords.join(", ")}`]
          : ["DuckDuckGo 搜索结果"],
        source: "DuckDuckGo",
      });
    }

    return { candidates, totalFound: candidates.length, provider: this.name };
  }
}
