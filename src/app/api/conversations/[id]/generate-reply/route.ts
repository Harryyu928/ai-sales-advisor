// POST /api/conversations/[id]/generate-reply —— AI 生成建议回复
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { generateReply } from "@/services/reply-service";
import type { StylePreset } from "@/lib/reply-prompts";

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

    // 查询对话（必须属于当前用户）
    const conversation = await prisma.conversation.findUnique({
      where: { id, userId: user.id },
      include: {
        messages: { orderBy: { sequence: "asc" } },
      },
    });
    if (!conversation) throw new ApiError(404, "对话不存在");

    const result = await generateReply({
      conversationTitle: conversation.title || "",
      messages: conversation.messages.map((m) => ({
        role: m.senderRole as "ADVISOR" | "CUSTOMER" | "UNKNOWN",
        content: m.content ?? "",
        sequence: m.sequence,
      })),
      style,
    });

    return NextResponse.json({ ok: true, data: result });
  });
}
