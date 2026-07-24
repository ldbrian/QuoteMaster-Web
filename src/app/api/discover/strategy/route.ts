import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { generateSearchStrategy } from "@/src/engines/discovery/service/search-strategy-service";

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuthenticatedUser(req);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await req.json();
    const { market, product, clientType } = body;

    if (!market || !product || !clientType) {
      return NextResponse.json(
        { error: "请填写目标市场、产品和客户类型" },
        { status: 400 }
      );
    }

    const strategy = await generateSearchStrategy({ market, product, clientType });

    return NextResponse.json({ strategy });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Discover strategy API error:", message, e);
    return NextResponse.json({ error: "生成搜索策略失败，请重试" }, { status: 500 });
  }
}
