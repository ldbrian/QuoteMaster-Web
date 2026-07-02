import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/utils/prisma";

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const threadId = params.id;

    if (!threadId) {
      return NextResponse.json({ success: false, error: "thread_id is required" }, { status: 400 });
    }

    const thread = await prisma.businessThread.update({
      where: { id: threadId },
      data: {
        business_state: "DORMANT",
        attention_state: "COMPLETED",
      },
      select: {
        id: true,
        business_state: true,
        attention_state: true,
      },
    });

    return NextResponse.json({ success: true, thread_id: thread.id, data: thread });
  } catch (error) {
    console.error("PATCH /api/threads/[id]/archive failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
