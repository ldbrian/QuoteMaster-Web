import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { discoveryService } from "@/src/engines/discovery/service/discovery-service";
import { scoreCandidates } from "@/src/engines/discovery/utils/icp-matcher";

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Discover search API error:", message, e);
  return NextResponse.json({ error: "搜索失败，请检查 Brave Search API 配置" }, { status: 500 });
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { keywords } = body;

    if (!keywords?.length) {
      return NextResponse.json({ error: "请输入搜索关键词" }, { status: 400 });
    }

    const providerName = discoveryService.getProvider("deep-search") ? "deep-search" : "brave-search";
    const result = await discoveryService.discover(
      { keywords, icp: { industries: keywords } },
      providerName
    );

    const candidates = scoreCandidates(
      { keywords },
      result.candidates.map((c) => ({
        companyName: c.companyName,
        website: c.website,
      }))
    );

    return NextResponse.json({
      total: candidates.length,
      provider: providerName,
      candidates,
    });
  } catch (e) {
    return handleError(e);
  }
}
