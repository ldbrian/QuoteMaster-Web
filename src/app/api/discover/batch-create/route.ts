import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";
import { researchService } from "@/src/engines/research/service/research-service";
import { analyzeOpportunity } from "@/src/engines/decision/decision";
import { runWithConcurrencyLimit } from "@/src/utils/concurrency";

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Discover batch-create API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}

type CandidateInput = {
  companyName: string;
  website?: string;
};

const CONCURRENCY = 3;
const MAX_BATCH = 10;

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { candidates: candidateList } = body as { candidates: CandidateInput[] };

    if (!candidateList?.length) {
      return NextResponse.json({ error: "请提供客户列表" }, { status: 400 });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile?.isCompleted) {
      return NextResponse.json({ error: "请先完善公司资料再发现客户" }, { status: 400 });
    }

    const companyDna = {
      companyName: profile.companyName,
      mainProducts: profile.mainProducts,
      coreAdvantages: profile.coreAdvantages,
      targetCustomerType: profile.targetCustomerType,
      targetMarkets: profile.targetMarkets,
      unsuitableClients: profile.unsuitableClients,
    };

    const slice = candidateList.slice(0, MAX_BATCH);
    const results: { companyName: string; success: boolean; opportunityId?: string; error?: string }[] = [];

    await runWithConcurrencyLimit(slice, CONCURRENCY, async (candidate) => {
      try {
        const research = await researchService.research({
          companyName: candidate.companyName,
          website: candidate.website,
        });

        const analysis = await analyzeOpportunity(research, companyDna, user.id);

        const opportunity = await prisma.opportunity.create({
          data: {
            userId: user.id,
            companyName: candidate.companyName,
            website: candidate.website || null,
            buyerProfile: analysis.buyerProfile,
            productFit: analysis.productFit,
            valueScore: analysis.valueScore,
            approachAngle: analysis.approachAngle,
            risks: analysis.risks,
            insight: analysis.insight,
            summary: analysis.summary,
            confidenceScore: analysis.confidenceScore,
            confidenceReason: analysis.confidenceReason,
            decisionAdvice: analysis.decisionAdvice,
            rawAnalysis: analysis,
            researchResult: research,
          },
        });

        results.push({ companyName: candidate.companyName, success: true, opportunityId: opportunity.id });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`Batch create: failed for ${candidate.companyName}:`, errMsg);
        results.push({ companyName: candidate.companyName, success: false, error: "分析失败" });
      }
    });

    return NextResponse.json({
      total: candidateList.length,
      processed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (e) {
    return handleError(e);
  }
}
