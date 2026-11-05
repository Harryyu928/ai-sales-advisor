// 客户诊断 API：GET 获取最新诊断，POST 触发重新诊断
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { runCustomerDiagnostic } from "@/services/customer-diagnostic-service";

export const maxDuration = 90;
export const runtime = "nodejs";

// GET /api/customers/[id]/diagnose —— 获取诊断（默认最新，?versionId= 加载指定历史版本）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;
    const url = new URL(req.url);
    const versionId = url.searchParams.get("versionId");

    // 版本列表（供历史抽屉）
    const versions = await prisma.customerDiagnostic.findMany({
      where: { customerId: id, userId: user.id },
      orderBy: { version: "desc" },
      select: { id: true, version: true, createdAt: true, salesStage: true, completeness: true },
    });

    // 指定版本 or 最新
    const diag = versionId
      ? await prisma.customerDiagnostic.findFirst({
          where: { id: versionId, customerId: id, userId: user.id },
        })
      : await prisma.customerDiagnostic.findFirst({
          where: { customerId: id, userId: user.id, isLatest: true },
          orderBy: { createdAt: "desc" },
        });

    return NextResponse.json({ ok: true, data: { diagnostic: diag, versions } });
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
    return NextResponse.json({ ok: true, data: result });
  });
}
