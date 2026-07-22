import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { opportunityId, helpful, editedEmail, sent, comment, accuracyRating } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity || opportunity.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Handle AnalysisFeedback (accuracyRating)
    if (accuracyRating !== undefined) {
      const existing = await prisma.analysisFeedback.findFirst({
        where: { opportunityId, userId: user.id },
      });
      let af;
      if (existing) {
        af = await prisma.analysisFeedback.update({
          where: { id: existing.id },
          data: { accuracyRating, helpful: undefined },
        });
      } else {
        af = await prisma.analysisFeedback.create({
          data: { opportunityId, userId: user.id, accuracyRating },
        });
      }
      return NextResponse.json({ feedback: af });
    }

    // Handle legacy Feedback (helpful, editedEmail, sent)
    if (helpful !== undefined || editedEmail !== undefined || sent !== undefined) {
      const existing = await prisma.feedback.findFirst({
        where: { opportunityId, userId: user.id },
      });
      let fb;
      if (existing) {
        fb = await prisma.feedback.update({
          where: { id: existing.id },
          data: {
            helpful: helpful ?? existing.helpful,
            editedEmail: editedEmail ?? existing.editedEmail,
            sent: sent ?? existing.sent,
            comment: comment ?? existing.comment,
          },
        });
      } else {
        fb = await prisma.feedback.create({
          data: {
            opportunityId,
            userId: user.id,
            helpful: helpful ?? null,
            editedEmail: editedEmail ?? null,
            sent: sent ?? null,
            comment: comment ?? null,
          },
        });
      }
      // Also sync helpful to AnalysisFeedback
      if (helpful !== undefined) {
        const af = await prisma.analysisFeedback.findFirst({ where: { opportunityId, userId: user.id } });
        if (af) {
          await prisma.analysisFeedback.update({ where: { id: af.id }, data: { helpful } });
        } else {
          await prisma.analysisFeedback.create({ data: { opportunityId, userId: user.id, helpful } });
        }
      }
      return NextResponse.json({ feedback: fb });
    }

    return NextResponse.json({ error: "No feedback data provided" }, { status: 400 });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
