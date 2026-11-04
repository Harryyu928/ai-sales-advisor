// 健康检查：数据库连通性 + AI 配置状态
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiConfigured } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  let dbOk = false;
  let tableCount = 0;
  try {
    const rows = await prisma.$queryRaw<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'`;
    tableCount = rows[0]?.count ?? 0;
    dbOk = true;
  } catch (e) {
    console.error("[health] 数据库检查失败:", e);
  }

  return NextResponse.json({
    ok: dbOk,
    status: dbOk ? "ok" : "degraded",
    db: dbOk ? "connected" : "error",
    tableCount,
    ai: aiConfigured ? "configured" : "not_configured",
    version: "1.0.0",
    time: new Date().toISOString(),
  });
}
