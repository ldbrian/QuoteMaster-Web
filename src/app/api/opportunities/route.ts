import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";
import { analyzeOpportunity } from "@/src/engines/decision/decision";
import { researchService } from "@/src/engines/research/service/research-service";

export async function GET(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const opportunities = await prisma.opportunity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        productFit: true,
        valueScore: true,
        summary: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ opportunities });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, website, description, additionalInfo } = body;

    if (!companyName?.trim()) {
      return NextResponse.json({ error: "公司名称不能为空" }, { status: 400 });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile?.isCompleted) {
      return NextResponse.json(
        { error: "请先完善公司资料（Company DNA）再分析客户" },
        { status: 400 }
      );
    }

    const research = await researchService.research({
      companyName, website, description, additionalInfo,
    });

    const analysis = await analyzeOpportunity(
      research,
      {
        companyName: profile.companyName,
        mainProducts: profile.mainProducts,
        coreAdvantages: profile.coreAdvantages,
        targetCustomerType: profile.targetCustomerType,
        targetMarkets: profile.targetMarkets,
        unsuitableClients: profile.unsuitableClients,
      },
      user.id
    );

    const opportunity = await prisma.opportunity.create({
      data: {
        userId: user.id,
        companyName,
        website: website || null,
        description: description || null,
        additionalInfo: additionalInfo || null,
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

    return NextResponse.json({ opportunity });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
