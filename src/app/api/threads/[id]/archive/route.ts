import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/utils/prisma";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuthenticatedUser(req);

    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const threadId = params.id;

    if (!threadId) {
      return NextResponse.json({ success: false, error: "thread_id is required" }, { status: 400 });
    }

    const updated = await prisma.businessThread.updateMany({
      where: { id: threadId, owner_user_id: auth.user.id },
      data: {
        business_state: "DORMANT",
        attention_state: "COMPLETED",
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json({ success: false, error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, thread_id: threadId });
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
