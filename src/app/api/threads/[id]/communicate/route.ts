import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";
import { analyzeCommunication } from "@/src/engines/action/thread";

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
    const body = await req.json();
    const { messageBody, source, isFromCustomer, timestamp } = body;

    if (!messageBody?.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const thread = await prisma.businessThread.findUnique({
      where: { id },
      include: {
        communications: {
          orderBy: { timestamp: "desc" },
          take: 3,
          select: { messageBody: true, isFromCustomer: true },
        },
      },
    });

    if (!thread || thread.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingContext = thread.context
      ? JSON.stringify(thread.context)
      : thread.communications.map((c) => c.messageBody).join("\n");

    const analysis = await analyzeCommunication(
      messageBody,
      existingContext,
      user.id
    );

    const communication = await prisma.communication.create({
      data: {
        threadId: id,
        source: source || "MANUAL",
        messageBody,
        isFromCustomer: isFromCustomer ?? true,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        extractedSignals: analysis,
      },
    });

    const updated = await prisma.businessThread.update({
      where: { id },
      data: {
        status: analysis.status || thread.status,
        priority: analysis.priority || thread.priority,
        nextAction: analysis.nextAction || thread.nextAction,
        context: {
          summary: analysis.summary,
          intent: analysis.intent,
          keyInfo: analysis.keyInfo,
        },
        contextUpdatedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ communication, thread: updated, analysis });
  } catch (e) {
    return handleError(e);
  }
}

async function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("API error:", message, e);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
