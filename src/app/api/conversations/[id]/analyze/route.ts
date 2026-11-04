// POST /api/conversations/[id]/analyze —— 客户意图与咨询阶段分析
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { analyzeConversation } from "@/services/reply-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id, userId: user.id },
      include: {
        messages: { orderBy: { sequence: "asc" } },
      },
    });
    if (!conversation) throw new ApiError(404, "对话不存在");

    const result = await analyzeConversation(
      conversation.messages.map((m) => ({
        role: m.senderRole,
        content: m.content ?? "",
      }))
    );

    return NextResponse.json({ ok: true, data: result });
  });
}
