// POST /api/conversations/[id]/generate-reply —— AI 生成建议回复（V2.0 全流程）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { generateReplyV2 } from "@/services/reply-service";
import type { StylePreset } from "@/lib/reply-prompts";

const VALID_STYLES: StylePreset[] = ["brief", "professional", "natural", "gentle"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const style = (body.style as StylePreset) || "professional";
    if (!VALID_STYLES.includes(style)) throw new ApiError(400, "无效的回复风格");
    const applyMemory = body.applyMemory !== false; // 默认自动应用客户事实
    const forceAnalysis = body.forceAnalysis === true;

    const result = await generateReplyV2({
      conversationId: id,
      userId: user.id,
      style,
      forceAnalysis,
      applyMemory,
    });

    return NextResponse.json({ ok: true, data: result });
  });
}
