import { DiscoveryProvider } from "./discovery-provider";
import { DiscoveryInput, DiscoveryResult, CandidateCompany } from "../models/discovery-types";

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

const DEFAULT_RESULTS = 10;

export class GoogleSearchProvider implements DiscoveryProvider {
  readonly name = "google-search";

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !cx) {
      throw new Error("GOOGLE_API_KEY or GOOGLE_CSE_ID not configured");
    }

    const keywords = [
      ...(input.icp?.industries || []),
      ...(input.icp?.regions || []),
      ...(input.keywords || []),
    ];

    const query = keywords.join(" ");
    if (!query.trim()) {
      return { candidates: [], totalFound: 0, provider: this.name };
    }

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", `${query} company`);
    url.searchParams.set("num", String(Math.min(input.icp?.companySize ? 10 : DEFAULT_RESULTS, 10)));

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Search API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const items: any[] = data.items || [];

    const seen = new Set<string>();
    const candidates: CandidateCompany[] = [];

    for (const item of items) {
      const companyName = extractCompanyName(item.title || "", item.link || "");
      const key = companyName.toLowerCase().replace(/\s+/g, "");
      if (seen.has(key) || !companyName || companyName.length < 2) continue;
      seen.add(key);

      const snippet = (item.snippet || "").toLowerCase();
      const matchedKeywords = keywords.filter((kw) =>
        snippet.includes(kw.toLowerCase()) || companyName.toLowerCase().includes(kw.toLowerCase())
      );

      candidates.push({
        companyName,
        website: item.link || undefined,
        confidence: Math.min(30 + matchedKeywords.length * 15, 90),
        matchReasons: matchedKeywords.length > 0
          ? [`搜索结果匹配: ${matchedKeywords.join(", ")}`]
          : ["Google 搜索结果"],
        source: "Google Search",
      });
    }

    return { candidates, totalFound: candidates.length, provider: this.name };
  }
}
