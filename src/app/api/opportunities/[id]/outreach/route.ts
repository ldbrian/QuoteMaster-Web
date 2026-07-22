import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";
import { generateOutreach } from "@/src/utils/ai/outreach";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const result = await generateOutreach(
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
}
