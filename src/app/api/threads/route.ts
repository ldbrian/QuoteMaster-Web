import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function GET(req: Request) {
  const { user, error } = await requireAuthenticatedUser(req);
  if (error || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = { userId: user.id };
  if (status && status !== "all") where.status = status;

  const threads = await prisma.businessThread.findMany({
    where,
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      title: true,
      companyName: true,
      status: true,
      priority: true,
      nextAction: true,
      lastActiveAt: true,
      createdAt: true,
      _count: { select: { communications: true } },
    },
  });

  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const { user, error } = await requireAuthenticatedUser(req);
  if (error || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await req.json();
  const { opportunityId, companyName, title } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const thread = await prisma.businessThread.create({
    data: {
      userId: user.id,
      opportunityId: opportunityId || null,
      companyName: companyName || null,
      title,
      status: "active",
      priority: "medium",
    },
  });

  return NextResponse.json({ thread });
}
