import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";
import { researchService } from "@/src/engines/research/service/research-service";
import { analyzeOpportunity } from "@/src/engines/decision/decision";
import { discoveryService } from "@/src/engines/discovery/service/discovery-service";

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Discover API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { rawList } = body;

    if (!rawList?.trim()) {
      return NextResponse.json({ error: "请输入客户列表" }, { status: 400 });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile?.isCompleted) {
      return NextResponse.json({ error: "请先完善公司资料再发现客户" }, { status: 400 });
    }

    const discoveryResult = await discoveryService.discover({
      rawList,
    });

    if (discoveryResult.candidates.length === 0) {
      return NextResponse.json({ error: "未能解析任何公司名称" }, { status: 400 });
    }

    const companyDna = {
      companyName: profile.companyName,
      mainProducts: profile.mainProducts,
      coreAdvantages: profile.coreAdvantages,
      targetCustomerType: profile.targetCustomerType,
      targetMarkets: profile.targetMarkets,
      unsuitableClients: profile.unsuitableClients,
    };

    const results: { companyName: string; success: boolean; opportunityId?: string; error?: string }[] = [];
    let processedCount = 0;

    for (const candidate of discoveryResult.candidates.slice(0, 10)) {
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
        processedCount++;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`Discover: failed to process ${candidate.companyName}:`, errMsg);
        results.push({ companyName: candidate.companyName, success: false, error: "分析失败" });
      }
    }

    return NextResponse.json({
      total: discoveryResult.candidates.length,
      processed: processedCount,
      failed: results.length - processedCount,
      results,
    });
  } catch (e) {
    return handleError(e);
  }
}
