// 知识库检索服务：基于 pgvector 的向量语义检索
// 从已审核知识中检索相关内容，注入到回复生成中
import { prisma } from "@/lib/db";
import { ArkClient } from "@/lib/ark";

const EMBEDDING_MODEL = "doubao-embedding-vision-251215";
const EMBEDDING_DIMENSIONS = 1024;

export interface KnowledgeSnippet {
  title: string;
  category: string;
  content: string;
  score: number;
}

interface VectorSearchRow {
  title: string;
  category: string;
  content: string;
  similarity: number;
}

/**
 * 基于向量语义的知识检索：
 * 1. 将查询文本转为 embedding 向量
 * 2. 用 pgvector 余弦距离计算相似度
 * 3. 返回最相关的 N 条知识
 */
export async function searchRelevantKnowledge(
  query: string,
  limit: number = 3
): Promise<KnowledgeSnippet[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    // 1. 生成查询向量
    const client = new ArkClient();
    const embResult = await client.multimodalEmbeddings({
      model: EMBEDDING_MODEL,
      inputs: [{ type: "text", text: trimmedQuery.slice(0, 2000) }],
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const queryVector = `[${embResult.embeddings[0].join(",")}]`;

    // 2. pgvector 相似度查询
    const rows = await prisma.$queryRaw<VectorSearchRow[]>`
      SELECT
        kd.title,
        kd.category,
        kc.content,
        1 - (kc.embedding <=> ${queryVector}::vector) AS similarity
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeDocument" kd ON kd.id = kc."documentId"
      WHERE kd."reviewStatus" = 'APPROVED'
      ORDER BY kc.embedding <=> ${queryVector}::vector
      LIMIT ${limit}
    `;

    // 3. 格式化结果，相似度转为百分制分数
    return rows.map((row) => ({
      title: row.title,
      category: row.category,
      content:
        row.content.length > 400 ? row.content.slice(0, 400) + "…" : row.content,
      score: Math.round(row.similarity * 100),
    }));
  } catch (e) {
    // embedding 服务失败时降级为关键词检索，保证功能可用
    console.error("向量检索失败，降级为关键词检索：", (e as Error).message);
    return fallbackKeywordSearch(trimmedQuery, limit);
  }
}

/**
 * 降级方案：关键词检索（embedding 服务不可用时使用）
 */
async function fallbackKeywordSearch(
  query: string,
  limit: number
): Promise<KnowledgeSnippet[]> {
  const keywords = query
    .split(/[\s,，。.!！?？、；;：:]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  if (keywords.length === 0) return [];

  const docs = await prisma.knowledgeDocument.findMany({
    where: {
      reviewStatus: "APPROVED",
      OR: [
        { title: { contains: keywords[0], mode: "insensitive" } },
        { content: { contains: keywords[0], mode: "insensitive" } },
      ],
    },
    take: 20,
    select: { title: true, category: true, content: true },
  });

  const scored = docs.map((doc) => {
    let score = 0;
    for (const kw of keywords) {
      if (doc.title.includes(kw)) score += 10;
      const contentLower = doc.content.toLowerCase();
      const kwLower = kw.toLowerCase();
      const occurrences = contentLower.split(kwLower).length - 1;
      score += occurrences * 2;
    }
    return { ...doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      title: s.title,
      category: s.category,
      content:
        s.content.length > 400 ? s.content.slice(0, 400) + "…" : s.content,
      score: s.score,
    }));
}

/** 把检索到的知识片段格式化为提示词上下文 */
export function formatKnowledgeContext(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) return "";
  const lines = snippets.map(
    (s, i) => `【知识${i + 1}】${s.title}（${s.category}）
${s.content}`
  );
  return `\n\n参考知识库内容（请在回复中自然运用，不要直接提及"知识库"）：\n${lines.join("\n\n")}`;
}
