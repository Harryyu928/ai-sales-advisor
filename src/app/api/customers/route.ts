// /api/customers —— 客户精简列表（GET），供下拉选择与关联使用
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const url = new URL(req.url);
    const q = url.searchParams.get("q");

    const customers = await prisma.customer.findMany({
      where: {
        userId: user.id,
        ...(q?.trim()
          ? { code: { contains: q.trim(), mode: "insensitive" } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        targetExam: true,
        targetScore: true,
        currentLevel: true,
        plannedExamDate: true,
        salesStage: true,
      },
    });

    return NextResponse.json({ ok: true, data: customers });
  });
}
