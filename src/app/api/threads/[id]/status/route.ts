import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/utils/prisma";

type AttentionStateValue = "ACTION_NEEDED" | "FOLLOW_UP" | "WAITING" | "COMPLETED";
type BusinessStateValue =
  | "NEW_INQUIRY"
  | "REQUIREMENT"
  | "NEED_QUOTE"
  | "NEGOTIATION"
  | "SAMPLING"
  | "CLOSING"
  | "DORMANT";

const attentionStates = new Set<AttentionStateValue>([
  "ACTION_NEEDED",
  "FOLLOW_UP",
  "WAITING",
  "COMPLETED",
]);

const businessStates = new Set<BusinessStateValue>([
  "NEW_INQUIRY",
  "REQUIREMENT",
  "NEED_QUOTE",
  "NEGOTIATION",
  "SAMPLING",
  "CLOSING",
  "DORMANT",
]);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const threadId = params.id;
    const payload = (await req.json().catch(() => ({}))) as {
      attention_state?: AttentionStateValue;
      business_state?: BusinessStateValue;
    };

    if (!threadId) {
      return NextResponse.json({ success: false, error: "thread_id is required" }, { status: 400 });
    }

    const data: Prisma.BusinessThreadUpdateInput = {
      last_active_at: new Date(),
    };

    if (payload.attention_state) {
      if (!attentionStates.has(payload.attention_state)) {
        return NextResponse.json({ success: false, error: "Invalid attention_state" }, { status: 400 });
      }
      data.attention_state = payload.attention_state;
    }

    if (payload.business_state) {
      if (!businessStates.has(payload.business_state)) {
        return NextResponse.json({ success: false, error: "Invalid business_state" }, { status: 400 });
      }
      data.business_state = payload.business_state;
    }

    if (!payload.attention_state && !payload.business_state) {
      return NextResponse.json({ success: false, error: "No status fields provided" }, { status: 400 });
    }

    const thread = await prisma.businessThread.update({
      where: { id: threadId },
      data,
      select: {
        id: true,
        business_state: true,
        attention_state: true,
        last_active_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ success: true, thread_id: thread.id, data: thread });
  } catch (error) {
    console.error("PATCH /api/threads/[id]/status failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
