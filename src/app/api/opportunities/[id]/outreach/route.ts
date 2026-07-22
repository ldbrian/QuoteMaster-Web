import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";
import { generateOutreach } from "@/src/engines/action/outreach";
import { researchService } from "@/src/engines/research/service/research-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await params;

    const drafts = await prisma.emailDraft.findMany({
      where: { opportunityId: id, userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity || opportunity.userId !== user.id) {
      return NextResponse.json({ error }, { status: 404 });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Company DNA not found" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { tone, instructions } = body;

    const research = await researchService.research({
      companyName: opportunity.companyName,
      website: opportunity.website || undefined,
      description: opportunity.description || undefined,
      additionalInfo: opportunity.additionalInfo || undefined,
    });

    const result = await generateOutreach(
      research,
      {
        companyName: profile.companyName,
        mainProducts: profile.mainProducts,
        coreAdvantages: profile.coreAdvantages,
        targetCustomerType: profile.targetCustomerType,
        targetMarkets: profile.targetMarkets,
        unsuitableClients: profile.unsuitableClients,
      },
      {
        buyerProfile: opportunity.buyerProfile || "",
        productFit: (opportunity.productFit as "HIGH" | "MEDIUM" | "LOW") || "MEDIUM",
        valueScore: opportunity.valueScore || 5,
        approachAngle: opportunity.approachAngle || "",
        risks: opportunity.risks || "",
        insight: opportunity.insight || "",
        summary: opportunity.summary || "",
        confidenceScore: opportunity.confidenceScore || 50,
        confidenceReason: opportunity.confidenceReason || "",
        decisionAdvice: opportunity.decisionAdvice || "",
      },
      { tone, instructions },
      user.id
    );

    const draft = await prisma.emailDraft.create({
      data: {
        userId: user.id,
        opportunityId: id,
        subject: result.subject,
        body: result.body,
        suggestions: result.suggestions,
        tone: tone || "professional",
      },
    });

    await prisma.opportunity.update({
      where: { id },
      data: { status: "outreach_generated" },
    });

    return NextResponse.json({ draft, result });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
