// POST /api/conversations/[id]/analyze —— 客户综合分析（V2.0：需求/顾虑/事实/矛盾/待办）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { analyzeConversationV2 } from "@/services/conversation-analysis-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    const outcome = await analyzeConversationV2(id, user.id, { force });
    return NextResponse.json({
      ok: true,
      data: {
        ...outcome.analysis,
        latencyMs: outcome.latencyMs,
        model: outcome.model,
      },
    });
  });
}
