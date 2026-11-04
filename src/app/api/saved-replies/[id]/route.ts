// /api/saved-replies/[id] —— 标记实际发送/效果好（PATCH）、删除（DELETE）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import {
  markSavedReplySent,
  markSavedReplyEffective,
} from "@/services/saved-reply-service";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "SENT") {
      const updated = await markSavedReplySent(id, user.id);
      return NextResponse.json({ ok: true, data: updated });
    }
    if (action === "EFFECTIVE") {
      const updated = await markSavedReplyEffective(id, user.id);
      return NextResponse.json({ ok: true, data: updated });
    }
    throw new ApiError(400, "无效操作，action 只能是 SENT 或 EFFECTIVE");
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
    const existing = await prisma.savedReply.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new ApiError(404, "话术不存在");

    // 回写 generation 收藏标记
    if (existing.replyGenerationId) {
      await prisma.replyGeneration.update({
        where: { id: existing.replyGenerationId },
        data: { isCollected: false },
      }).catch(() => {});
    }
    await prisma.savedReply.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { id } });
  });
}
