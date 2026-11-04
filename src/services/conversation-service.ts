// ConversationService：对话重建、去重合并、顺序规范化与结构化落库
// 处理 AI 识别结果的后处理：相邻重复合并 → 顺序重排 → 角色映射 → 保存到 chat_messages
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import type { RecognizedMessage } from "@/lib/schemas";

export type DbSenderRole = "ADVISOR" | "CUSTOMER" | "UNKNOWN";

/** 将 AI 输出的 sender_role 映射为数据库枚举 */
export function toDbSenderRole(role: RecognizedMessage["sender_role"]): DbSenderRole {
  if (role === "advisor") return "ADVISOR";
  if (role === "customer") return "CUSTOMER";
  return "UNKNOWN";
}

/**
 * 合并相邻重复消息（同一发言方、内容完全相同且相邻时合并为一条）
 * 多张连续截图的重叠区域会产生这类重复；合并后按顺序重新编号
 */
export function mergeNearDuplicates(messages: RecognizedMessage[]): RecognizedMessage[] {
  const sorted = [...messages].sort((a, b) => a.order - b.order);
  const out: RecognizedMessage[] = [];
  for (const m of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.sender_role === m.sender_role && prev.content === m.content) {
      // 合并：保留较早的 order 与截图来源，备注合并
      prev.note = [prev.note, m.note].filter(Boolean).join("；") || null;
      continue;
    }
    out.push({ ...m });
  }
  return out.map((m, i) => ({ ...m, order: i + 1 }));
}

/** 解析 "YYYY-MM-DD HH:mm" 为 Date；非法返回 null（不编造时间） */
export function parseTimestamp(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface SaveConversationInput {
  userId: string;
  title: string | null;
  assetIds: string[]; // 按截图上传顺序
  messages: RecognizedMessage[];
  uncertainties: string[];
  model: string;
  latencyMs: number;
}

/**
 * 保存识别结果：创建 Conversation，写入 ChatMessage（sequence 顺序、发言方、来源截图），
 * 关联并更新截图状态；识别元数据（模型/耗时/不确定项）存入 recognitionMeta
 */
export async function saveConversation(input: SaveConversationInput): Promise<{ conversationId: string }> {
  const merged = mergeNearDuplicates(input.messages);

  // 校验截图归属并建立 上传顺序 → assetId 映射
  const assets = await prisma.screenshotAsset.findMany({
    where: { id: { in: input.assetIds }, userId: input.userId },
  });
  if (assets.length !== input.assetIds.length) {
    throw new ApiError(400, "部分截图不存在或无权限访问");
  }
  const assetByIndex = new Map<number, string>();
  input.assetIds.forEach((id, i) => assetByIndex.set(i + 1, id));

  const defaultTitle = `微信咨询 ${new Date().toLocaleDateString("zh-CN")}`;

  const conversation = await prisma.conversation.create({
    data: {
      userId: input.userId,
      title: input.title || defaultTitle,
      source: "wechat-screenshot",
      recognitionMeta: {
        model: input.model,
        latencyMs: input.latencyMs,
        uncertainties: input.uncertainties,
        sourceImageCount: input.assetIds.length,
      },
      messages: {
        create: merged.map((m) => {
          const sourceImageId = m.source_image_index
            ? assetByIndex.get(m.source_image_index) ?? null
            : null;
          return {
            senderRole: toDbSenderRole(m.sender_role),
            content: m.content,
            timestamp: parseTimestamp(m.timestamp),
            sequence: m.order,
            sourceImageId,
            note: m.note ?? null,
          };
        }),
      },
    },
  });

  await prisma.screenshotAsset.updateMany({
    where: { id: { in: input.assetIds } },
    data: { conversationId: conversation.id, status: "ANALYZED" },
  });

  return { conversationId: conversation.id };
}

/** 加载对话详情（含按顺序排列的消息与截图），校验归属 */
export async function getConversationDetail(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
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
  return conversation;
}
