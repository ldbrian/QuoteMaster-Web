import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function GET(req: Request) {
  try {
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
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
