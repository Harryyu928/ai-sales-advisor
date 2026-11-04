// 对话列表：当前用户的识别会话（含消息数、截图数）
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        _count: { select: { messages: true, screenshots: true } },
      },
    });
    return ok({ count: conversations.length, conversations });
  });
}
