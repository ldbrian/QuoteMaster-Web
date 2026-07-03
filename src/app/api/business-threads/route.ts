import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { getBusinessThreads, serializeThread } from "@/src/app/business-threads/lib/threads";

export async function GET(req: Request) {
  try {
    const auth = await requireAuthenticatedUser(req);

    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const threads = await getBusinessThreads(auth.user.id);
    return NextResponse.json({ success: true, data: threads.map(serializeThread) });
  } catch (error) {
    console.error("GET /api/business-threads failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
