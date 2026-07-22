import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function POST(req: Request) {
  const { user, error } = await requireAuthenticatedUser(req);
  if (error || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await req.json();
  const { opportunityId, helpful, editedEmail, sent, comment } = body;

  if (!opportunityId) {
    return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity || opportunity.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.feedback.findFirst({
    where: { opportunityId, userId: user.id },
  });

  let feedback;
  if (existing) {
    feedback = await prisma.feedback.update({
      where: { id: existing.id },
      data: {
        helpful: helpful ?? existing.helpful,
        editedEmail: editedEmail ?? existing.editedEmail,
        sent: sent ?? existing.sent,
        comment: comment ?? existing.comment,
      },
    });
  } else {
    feedback = await prisma.feedback.create({
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

  return NextResponse.json({ feedback });
}
