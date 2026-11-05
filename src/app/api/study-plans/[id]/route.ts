// /api/study-plans/[id] —— 方案详情（GET）与删除（DELETE）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { getStudyPlan, deleteStudyPlan } from "@/services/study-plan-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;
    const plan = await getStudyPlan(user.id, id);
    return NextResponse.json({ ok: true, data: plan });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;
    const result = await deleteStudyPlan(user.id, id);
    return NextResponse.json({ ok: true, data: result });
  });
}
