// 优秀话术服务（功能3）：收藏、四态区分、向量化、相似场景检索
// 关键：AI生成 / 收藏 / 确认发送 / 效果好 四态分开存储；相似案例只用于启发，生成时重新组织
import { prisma } from "@/lib/db";
import { ArkClient } from "@/lib/ark";
import { ApiError } from "@/lib/api";
import { toPlainJson } from "@/lib/utils";
import type { ConversationAnalysisResult } from "@/services/conversation-analysis-service";

const EMBEDDING_MODEL = "doubao-embedding-vision-251215";
const EMBEDDING_DIMENSIONS = 1024;

export interface CollectInput {
  userId: string;
  content: string;
  customerId?: string | null;
  conversationId?: string | null;
  replyGenerationId?: string | null;
  customerContext?: string;
  analysis?: ConversationAnalysisResult | null;
}

export interface SimilarReply {
  id: string;
  content: string;
  questionType: string | null;
  examType: string | null;
  stage: string | null;
  customerConcern: string | null;
  strategy: string | null;
  status: string;
  similarity: number;
}

/** 从已有分析结果推导话术元数据，不额外调用模型 */
function buildMeta(analysis?: ConversationAnalysisResult | null) {
  if (!analysis) {
    return {
      questionType: null,
      examType: null,
      stage: null,
      customerConcern: null,
      strategy: null,
      styleTraits: null,
    };
  }
  const examFact = analysis.customerFacts.find((f) => f.fieldKey === "targetExam");
  const concern = analysis.potentialConcerns.find((c) => c.certainty === "FACT");
  return {
    questionType: analysis.currentQuestion || analysis.explicitNeeds[0] || null,
    examType: examFact?.value || null,
    stage: analysis.stage || null,
    customerConcern: concern?.concern || analysis.customerFacts.find((f) => f.fieldKey === "concerns")?.value || null,
    strategy: analysis.recommendedDirection || null,
    styleTraits: {
      length: analysis.stage,
      explicitNeeds: analysis.explicitNeeds,
    },
  };
}

/** 生成内容的向量（失败时降级为无向量，不阻断收藏） */
async function embedContent(content: string): Promise<number[] | null> {
  try {
    const client = new ArkClient();
    const emb = await client.multimodalEmbeddings({
      model: EMBEDDING_MODEL,
      inputs: [{ type: "text", text: content.slice(0, 2000) }],
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return emb.embeddings[0];
  } catch (e) {
    console.error("话术向量化失败，降级为无向量：", (e as Error).message);
    return null;
  }
}

/** 收藏为优秀话术（状态 COLLECTED），并回写 generation 标记 */
export async function collectSavedReply(input: CollectInput) {
  // 若关联同一 generation，避免重复收藏
  if (input.replyGenerationId) {
    const dup = await prisma.savedReply.findUnique({
      where: { replyGenerationId: input.replyGenerationId },
    });
    if (dup) return dup;
  }

  const meta = buildMeta(input.analysis);
  const vector = await embedContent(input.content);

  const saved = await prisma.savedReply.create({
    data: {
      userId: input.userId,
      customerId: input.customerId || null,
      conversationId: input.conversationId || null,
      replyGenerationId: input.replyGenerationId || null,
      content: input.content,
      questionType: meta.questionType,
      examType: meta.examType,
      stage: meta.stage,
      customerConcern: meta.customerConcern,
      strategy: meta.strategy,
      ...(meta.styleTraits ? { styleTraits: toPlainJson(meta.styleTraits) } : {}),
      customerContext: input.customerContext || null,
      status: "COLLECTED",
      favorite: true,
    },
  });

  // pgvector 字段为 Unsupported 类型，需用 raw SQL 单独写入
  if (vector) {
    const vectorLiteral = `[${vector.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE "SavedReply"
      SET embedding = ${vectorLiteral}::vector
      WHERE id = ${saved.id}
    `;
  }

  if (input.replyGenerationId) {
    await prisma.replyGeneration.update({
      where: { id: input.replyGenerationId },
      data: { isCollected: true },
    });
  }
  return saved;
}

/** 标记实际发送（状态 SENT）；复制不等于发送，必须显式调用 */
export async function markSavedReplySent(id: string, userId: string) {
  const existing = await prisma.savedReply.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "话术不存在");
  return prisma.savedReply.update({
    where: { id },
    data: { status: existing.status === "EFFECTIVE" ? "EFFECTIVE" : "SENT" },
  });
}

/** 确认沟通效果好（状态 EFFECTIVE），风格学习优先参考这类内容 */
export async function markSavedReplyEffective(id: string, userId: string) {
  const existing = await prisma.savedReply.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "话术不存在");
  if (existing.replyGenerationId) {
    await prisma.replyGeneration.update({
      where: { id: existing.replyGenerationId },
      data: { effectiveFlag: true },
    });
  }
  return prisma.savedReply.update({ where: { id }, data: { status: "EFFECTIVE" } });
}

interface SimilarRow {
  id: string;
  content: string;
  questionType: string | null;
  examType: string | null;
  stage: string | null;
  customerConcern: string | null;
  strategy: string | null;
  status: string;
  similarity: number;
}

/** 相似场景检索：向量召回历史优秀话术（仅用于启发，不可机械复制） */
export async function searchSimilarSavedReplies(
  query: string,
  limit: number = 3
): Promise<SimilarReply[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let vector: number[] | null;
  try {
    const client = new ArkClient();
    const emb = await client.multimodalEmbeddings({
      model: EMBEDDING_MODEL,
      inputs: [{ type: "text", text: trimmed.slice(0, 2000) }],
      dimensions: EMBEDDING_DIMENSIONS,
    });
    vector = emb.embeddings[0];
  } catch (e) {
    console.error("案例检索向量化失败：", (e as Error).message);
    return [];
  }
  if (!vector) return [];

  const queryVector = `[${vector.join(",")}]`;
  const rows = await prisma.$queryRaw<SimilarRow[]>`
    SELECT
      id, content, "questionType", "examType", stage,
      "customerConcern", strategy, status,
      1 - (embedding <=> ${queryVector}::vector) AS similarity
    FROM "SavedReply"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${queryVector}::vector
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
}

/** 格式化历史案例为提示词上下文（明确要求重新组织，不得照抄） */
export function formatSavedReplyContext(replies: SimilarReply[]): string {
  if (replies.length === 0) return "";
  const items = replies
    .map((r, i) => `案例${i + 1}（${r.stage || "阶段未知"}，相似度${(r.similarity * 100).toFixed(0)}%）：\n${r.content}`)
    .join("\n\n");
  return `\n\n个人历史优秀话术（仅参考其思路与语气，必须结合当前客户情况重新组织，禁止原样复制）：\n${items}`;
}
