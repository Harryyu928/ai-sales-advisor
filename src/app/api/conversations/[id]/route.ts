// 对话详情：消息按 sequence 排列 + 关联截图（校验归属）
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, ApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: {
          orderBy: { sequence: "asc" },
          include: { sourceImage: { select: { id: true, originalName: true, mimeType: true } } },
        },
        screenshots: {
          orderBy: { createdAt: "asc" },
          select: { id: true, originalName: true, mimeType: true, createdAt: true },
        },
      },
    });
    if (!conversation) throw new ApiError(404, "对话不存在或无权限访问");
    return ok(conversation);
  });
}
