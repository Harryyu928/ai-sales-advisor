// 知识库检索服务：从已审核知识中检索相关内容，注入到回复生成中
import { prisma } from "@/lib/db";

export interface KnowledgeSnippet {
  title: string;
  category: string;
  content: string;
  score: number;
}

/**
 * 基于关键词的知识检索：从已审核知识中找出与对话最相关的内容
 * 后续可替换为 pgvector 向量语义检索
 */
export async function searchRelevantKnowledge(
  query: string,
  limit: number = 3
): Promise<KnowledgeSnippet[]> {
  // 从查询中提取关键词（简单分词：按空格和标点切分，过滤短词）
  const keywords = query
    .split(/[\s,，。.!！?？、；;：:]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  if (keywords.length === 0) return [];

  // 从已审核知识中全文匹配
  const docs = await prisma.knowledgeDocument.findMany({
    where: {
      reviewStatus: "APPROVED",
      OR: [
        { title: { contains: keywords[0], mode: "insensitive" } },
        { content: { contains: keywords[0], mode: "insensitive" } },
      ],
    },
    take: 20,
    select: {
      title: true,
      category: true,
      content: true,
    },
  });

  if (docs.length === 0) return [];

  // 简单打分：标题命中权重高，内容命中按出现次数
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

  // 按分数排序，取前 N 条
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      title: s.title,
      category: s.category,
      content: s.content.length > 300 ? s.content.slice(0, 300) + "…" : s.content,
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
