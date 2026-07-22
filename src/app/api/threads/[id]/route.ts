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

    const thread = await prisma.businessThread.findUnique({
      where: { id },
      include: {
        communications: { orderBy: { timestamp: "asc" } },
        opportunity: {
          select: {
            id: true,
            companyName: true,
            productFit: true,
            valueScore: true,
            insight: true,
          },
        },
      },
    });

    if (!thread || thread.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ thread });
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
    const { status, priority, nextAction } = body;

    const thread = await prisma.businessThread.findUnique({
      where: { id },
    });

    if (!thread || thread.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.businessThread.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(nextAction !== undefined && { nextAction }),
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ thread: updated });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
