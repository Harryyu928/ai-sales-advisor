// 截图识别：调视觉模型识别 → JSON Schema 校验 → 对话重建去重 → 结构化落库
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, fail, ApiError } from "@/lib/api";
import { recognizeScreenshots } from "@/services/vision-service";
import { saveConversation, getConversationDetail } from "@/services/conversation-service";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 120;

const analyzeSchema = z.object({
  assetIds: z.array(z.string().min(1)).min(1).max(10),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();

    const body = await req.json().catch(() => null);
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) return fail(400, "参数不正确：请提供 assetIds（1-10 个截图 ID）");

    const { assetIds } = parsed.data;

    // 校验截图归属，按传入顺序取（第 1 张 = 最早截图）
    const assets = await prisma.screenshotAsset.findMany({
      where: { id: { in: assetIds }, userId: user.id },
      select: { id: true, storagePath: true, mimeType: true },
    });
    if (assets.length !== assetIds.length) {
      throw new ApiError(404, "部分截图不存在或无权限访问");
    }
    const ordered = assetIds
      .map((id) => assets.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    // 调用豆包视觉模型识别（多图合并去重由模型 + 服务层共同完成）
    const outcome = await recognizeScreenshots(
      ordered.map((a) => ({ id: a.id, storagePath: a.storagePath, mimeType: a.mimeType }))
    );

    // 对话重建 + 结构化落库
    const { conversationId } = await saveConversation({
      userId: user.id,
      title: outcome.result.conversation_title ?? null,
      assetIds,
      messages: outcome.result.messages,
      uncertainties: outcome.result.uncertainties ?? [],
      model: outcome.model,
      latencyMs: outcome.latencyMs,
    });

    await audit(user.id, "ANALYZE_SCREENSHOTS", {
      entityType: "Conversation",
      entityId: conversationId,
      detail: {
        messageCount: outcome.result.messages.length,
        model: outcome.model,
        latencyMs: outcome.latencyMs,
        attempts: outcome.attempts,
      },
    });

    const conversation = await getConversationDetail(user.id, conversationId);
    return ok(conversation, 201);
  });
}
