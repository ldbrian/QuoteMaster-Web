import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
