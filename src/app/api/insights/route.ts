import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function GET(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const [totalOpps, decisionAgg, accuracyAgg] = await Promise.all([
      prisma.opportunity.count({ where: { userId: user.id } }),
      prisma.opportunity.groupBy({
        by: ["decisionStatus"],
        where: { userId: user.id, decisionStatus: { not: null } },
        _count: true,
      }),
      prisma.analysisFeedback.aggregate({
        where: { userId: user.id, accuracyRating: { not: null } },
        _avg: { accuracyRating: true },
        _count: true,
      }),
    ]);

    const totalDecided = decisionAgg.reduce((sum, g) => sum + g._count, 0);
    const decisions: Record<string, number> = {};
    for (const g of decisionAgg) {
      if (g.decisionStatus) decisions[g.decisionStatus] = g._count;
    }

    return NextResponse.json({
      totalOpportunities: totalOpps,
      totalDecided,
      decisions,
      accuracyAvg: accuracyAgg._avg.accuracyRating ? Math.round(accuracyAgg._avg.accuracyRating * 10) / 10 : null,
      accuracyCount: accuracyAgg._count,
    });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
