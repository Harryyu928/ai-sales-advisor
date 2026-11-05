// /api/effect-analysis —— AI 回复效果分析（GET）
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { getEffectAnalysis } from "@/services/effect-analysis-service";

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const result = await getEffectAnalysis(user.id);
    return NextResponse.json({ ok: true, data: result });
  });
}
