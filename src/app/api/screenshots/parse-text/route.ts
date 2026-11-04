// POST /api/conversations/parse-text —— 从粘贴文字解析对话
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { parseTextConversation } from "@/services/text-conversation-parse";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json();
    const { text } = body;
    if (!text || !text.trim()) {
      throw new ApiError(400, "请粘贴聊天记录文字");
    }

    const messages = await parseTextConversation(text);

    // 创建对话
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "粘贴文字对话",
        source: "text",
      },
    });

    // 批量插入消息
    await prisma.chatMessage.createMany({
      data: messages.map((m, i) => ({
        conversationId: conversation.id,
        senderRole: m.role,
        content: m.content,
        sequence: i + 1,
      })),
    });

    return NextResponse.json({
      ok: true,
      data: {
        conversationId: conversation.id,
        messages,
      },
    });
  });
}
