import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

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

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity || opportunity.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { decisionStatus, decisionReason, decisionNote } = body;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity || opportunity.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (decisionStatus) {
      updateData.decisionStatus = decisionStatus;
      updateData.decidedAt = new Date();
    }
    if (decisionReason !== undefined) updateData.decisionReason = decisionReason;
    if (decisionNote !== undefined) updateData.decisionNote = decisionNote;

    const updated = await prisma.opportunity.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ opportunity: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
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

    await prisma.opportunity.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
