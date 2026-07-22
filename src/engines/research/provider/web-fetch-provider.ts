import { ResearchResult } from "../models/research-result";
import { ResearchProvider, ResearchInput } from "./research-provider";
import { ManualProvider } from "./manual-provider";
import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";

type ExtractedInfo = {
  products: string;
  markets: string;
  businessModel: string;
};

const EXTRACTION_PROMPT = `从以下公司网站文本中提取结构化信息。只提取文本中明确提到的信息，不要猜测。

返回 JSON：
{
  "products": "主营产品或服务",
  "markets": "目标市场或客户群体",
  "businessModel": "商业模式（B2B/B2C/OEM/ODM/品牌零售等）"
}

如果无法确定某个字段，留空字符串。`;

export class WebFetchProvider implements ResearchProvider {
  readonly name = "web-fetch";

  async research(input: ResearchInput): Promise<ResearchResult> {
    const manual = new ManualProvider();
    const base = await manual.research(input);

    if (!input.website) return base;

    try {
      const html = await this.fetchPage(input.website);
      const text = this.extractText(html);

      if (text.length < 50) return base;

      const extracted = await this.extractInfo(text);

      if (extracted.products) base.products = extracted.products;
      if (extracted.markets) base.markets = extracted.markets;
      if (extracted.businessModel) base.businessModel = extracted.businessModel;

      base.knownFacts.push(`官网分析：产品信息 - ${extracted.products || "未明确提及"}`);
      base.knownFacts.push(`官网分析：市场信息 - ${extracted.markets || "未明确提及"}`);
      base.knownFacts.push(`官网分析：商业模式 - ${extracted.businessModel || "未明确提及"}`);
      base.sources.push("官网");

      const resolved: string[] = [];
      if (extracted.products) resolved.push("产品/市场等详细信息未知");
      if (extracted.businessModel) resolved.push("客户商业模式（B2B/B2C）未知");
      if (extracted.markets) resolved.push("客户目标市场区域未知");
      base.unknownFacts = base.unknownFacts.filter((f) => !resolved.includes(f));
    } catch (e) {
      console.warn("WebFetchProvider: failed to fetch or parse", input.website, e);
    }

    return base;
  }

  private async fetchPage(url: string): Promise<string> {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(normalized, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    if (html.length > 200_000) return html.slice(0, 200_000);
    return html;
  }

  private extractText(html: string): string {
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
    const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
    const withoutTags = withoutStyles.replace(/<[^>]+>/g, " ");
    const decoded = withoutTags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, " ");
    const collapsed = decoded.replace(/\s+/g, " ").trim();
    const lines = collapsed.split(/[。.!?\n]+/).filter((l) => l.trim().length > 10);
    return lines.slice(0, 60).join(". ").trim();
  }

  private async extractInfo(text: string): Promise<ExtractedInfo> {
    const content = await callDeepSeek(EXTRACTION_PROMPT, text, {
      responseFormat: "json_object",
      temperature: 0.1,
    });
    return JSON.parse(cleanJsonResponse(content)) as ExtractedInfo;
  }
}
