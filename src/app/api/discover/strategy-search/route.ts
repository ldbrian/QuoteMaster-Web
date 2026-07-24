import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { generateSearchStrategy } from "@/src/engines/discovery/service/search-strategy-service";
import { discoveryService } from "@/src/engines/discovery/service/discovery-service";
import { scoreCandidates } from "@/src/engines/discovery/utils/icp-matcher";
import { runWithConcurrencyLimit } from "@/src/utils/concurrency";
import type { SearchQuery } from "@/src/engines/discovery/service/search-strategy-service";

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Discover strategy-search API error:", message, e);
  return NextResponse.json({ error: "搜索失败，请重试" }, { status: 500 });
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { market, product, clientType } = body;

    if (!market || !product || !clientType) {
      return NextResponse.json({ error: "请填写目标市场、产品和客户类型" }, { status: 400 });
    }

    const icpKeywords = [market, product, clientType].filter(Boolean);

    // Step 1: Generate strategy
    const strategy = await generateSearchStrategy({ market, product, clientType });

    // Step 2: Run all queries through DuckDuckGo in parallel
    const ddg = discoveryService.getProvider("duckduckgo");
    if (!ddg) {
      return NextResponse.json({ error: "搜索引擎不可用" }, { status: 500 });
    }

    const allCandidates: { companyName: string; website?: string }[] = [];
    const seen = new Set<string>();

    await runWithConcurrencyLimit(strategy.queries, 3, async (q: SearchQuery) => {
      try {
        const result = await ddg.discover({
          keywords: [q.query],
          icp: { industries: icpKeywords },
        });
        for (const c of result.candidates) {
          const key = c.companyName.toLowerCase().replace(/\s+/g, "");
          if (!seen.has(key)) {
            seen.add(key);
            allCandidates.push({ companyName: c.companyName, website: c.website });
          }
        }
      } catch (e) {
        console.warn(`DuckDuckGo query "${q.query}" failed:`, e instanceof Error ? e.message : e);
      }
    });

    // Step 3: Score by ICP
    const scored = scoreCandidates({ keywords: icpKeywords }, allCandidates);

    return NextResponse.json({
      strategy,
      total: scored.length,
      candidates: scored.slice(0, 30),
    });
  } catch (e) {
    return handleError(e);
  }
}
