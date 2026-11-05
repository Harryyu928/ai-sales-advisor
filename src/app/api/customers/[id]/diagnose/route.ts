// 客户诊断 API：GET 获取最新诊断，POST 触发重新诊断
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runCustomerDiagnostic } from "@/services/customer-diagnostic-service";

export const maxDuration = 90;
export const runtime = "nodejs";

// GET /api/customers/[id]/diagnose —— 获取最新诊断
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;

    const diag = await prisma.customerDiagnostic.findFirst({
      where: { customerId: id, userId: user.id, isLatest: true },
      orderBy: { createdAt: "desc" },
    });

    // 同时返回历史版本数
    const totalVersions = await prisma.customerDiagnostic.count({
      where: { customerId: id, userId: user.id },
    });

    return { ok: true, data: { diagnostic: diag, totalVersions } };
  });
}

// POST /api/customers/[id]/diagnose —— 触发 AI 重新诊断
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;

    const result = await runCustomerDiagnostic(id, user.id);
    return { ok: true, data: result };
  });
}
