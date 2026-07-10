import { NextResponse } from "next/server";
import { prisma } from "@/src/utils/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckResult = {
  ok: boolean;
  detail?: string;
};

function envCheck(name: string): CheckResult {
  return process.env[name] ? { ok: true } : { ok: false, detail: `${name} is missing` };
}

function serializeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET() {
  const checks: Record<string, CheckResult> = {
    DATABASE_URL: envCheck("DATABASE_URL"),
    NEXT_PUBLIC_SUPABASE_URL: envCheck("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: envCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    DEEPSEEK_API_KEY: envCheck("DEEPSEEK_API_KEY"),
  };

  try {
    await prisma.$queryRawUnsafe("select 1 as ok");
    checks.database_connection = { ok: true };
  } catch (error) {
    checks.database_connection = { ok: false, detail: serializeError(error) };
  }

  try {
    await prisma.businessThread.findMany({
      take: 1,
      select: {
        id: true,
        owner_user_id: true,
        context: true,
        identity_cluster_key: true,
      },
    });
    checks.business_thread_schema = { ok: true };
  } catch (error) {
    checks.business_thread_schema = { ok: false, detail: serializeError(error) };
  }

  const ok = Object.values(checks).every((check) => check.ok);

  return NextResponse.json({
    success: ok,
    environment: process.env.VERCEL ? "vercel" : process.env.NODE_ENV || "unknown",
    checks,
  });
}
