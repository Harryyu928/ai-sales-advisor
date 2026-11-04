// 人工纠错：修改消息发言方/内容、删除错误消息
// 规格书要求：人工纠错结果必须保存，并优先采用人工确认结果（manuallyCorrected=true）
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    senderRole: z.enum(["ADVISOR", "CUSTOMER", "UNKNOWN"]).optional(),
    content: z.string().min(1).max(20000).optional(),
  })
  .refine((v) => v.senderRole !== undefined || v.content !== undefined, {
    message: "至少提供 senderRole 或 content 之一",
  });

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id, messageId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(400, "参数不正确：请提供 senderRole（ADVISOR/CUSTOMER/UNKNOWN）或 content");

    // 归属校验：消息必须属于该用户自己的对话
    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, conversation: { id, userId: user.id } },
    });
    if (!message) throw new ApiError(404, "消息不存在或无权限访问");

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { ...parsed.data, manuallyCorrected: true },
    });

    await audit(user.id, "CORRECT_MESSAGE", {
      entityType: "ChatMessage",
      entityId: messageId,
      detail: {
        conversationId: id,
        changed: Object.keys(parsed.data),
        before: { senderRole: message.senderRole, content: (message.content ?? "").slice(0, 100) },
      },
    });

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id, messageId } = await ctx.params;

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, conversation: { id, userId: user.id } },
    });
    if (!message) throw new ApiError(404, "消息不存在或无权限访问");

    await prisma.chatMessage.delete({ where: { id: messageId } });

    await audit(user.id, "DELETE_MESSAGE", {
      entityType: "ChatMessage",
      entityId: messageId,
      detail: { conversationId: id },
    });

    return ok({ deleted: true });
  });
}
