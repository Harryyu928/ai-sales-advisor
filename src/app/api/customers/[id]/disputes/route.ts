// /api/customers/[id]/disputes —— 待确认矛盾列表（GET）与人工裁决（POST）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { resolveDispute } from "@/services/customer-memory-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
      where: { id, userId: user.id },
    });
    if (!customer) throw new ApiError(404, "客户不存在");

    const disputes = await prisma.customerFact.findMany({
      where: { customerId: id, status: "DISPUTED" },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ok: true, data: disputes });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
      where: { id, userId: user.id },
    });
    if (!customer) throw new ApiError(404, "客户不存在");

    const body = await req.json().catch(() => ({}));
    const fieldKey = typeof body.fieldKey === "string" ? body.fieldKey : "";
    const decision = body.decision === "OLD" ? "OLD" : "NEW";
    if (!fieldKey) throw new ApiError(400, "缺少字段标识 fieldKey");

    const result = await resolveDispute(
      user.id,
      id,
      fieldKey,
      decision,
      typeof body.confirmedValue === "string" ? body.confirmedValue : undefined
    );
    return NextResponse.json({ ok: true, data: result });
  });
}
