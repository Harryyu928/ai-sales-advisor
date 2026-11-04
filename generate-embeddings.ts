// 为所有已审核知识生成 embedding 向量，写入 KnowledgeChunk 表
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ArkClient } from "./src/lib/ark";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      "postgresql://postgres.npylkrsppckumxbnoyez:EZjttGC2v9RviU0m@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  }),
});

const EMBEDDING_MODEL = "doubao-embedding-vision-251215";
const EMBEDDING_DIMENSIONS = 1024;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// 简单估算 token 数（中文按字符数粗略估算，英文按空格分词）
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
  return chineseChars + englishWords;
}

async function main() {
  const client = new ArkClient();

  // 获取所有知识文档
  const documents = await prisma.knowledgeDocument.findMany({
    where: { reviewStatus: "APPROVED" },
    select: { id: true, title: true, content: true, category: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`共找到 ${documents.length} 条已审核知识，开始生成 embedding...\n`);

  // 先清理已有的 chunk（避免重复）
  const existingChunks = await prisma.knowledgeChunk.count();
  if (existingChunks > 0) {
    console.log(`清理 ${existingChunks} 条旧 chunk...`);
    await prisma.knowledgeChunk.deleteMany({});
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    // 组合标题和内容作为向量化输入
    const fullText = `${doc.title}。${doc.content}`;

    try {
      const result = await client.multimodalEmbeddings({
        model: EMBEDDING_MODEL,
        inputs: [{ type: "text", text: fullText.slice(0, 3000) }], // 限制长度
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const embedding = result.embeddings[0];
      const vectorStr = `[${embedding.join(",")}]`;
      const tokenCount = estimateTokens(fullText);

      // 用 $executeRaw 插入，手动处理 pgvector 格式
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" (id, "documentId", "chunkIndex", content, embedding, "tokenCount", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${doc.id},
          0,
          ${doc.content},
          ${vectorStr}::vector,
          ${tokenCount},
          NOW()
        )
      `;

      success++;
      console.log(`✅ [${i + 1}/${documents.length}] ${doc.title}（${result.latencyMs}ms）`);
    } catch (e) {
      failed++;
      console.error(`❌ [${i + 1}/${documents.length}] ${doc.title}: ${(e as Error).message}`);

      // 如果是限流错误，等待更久
      if ((e as Error).message.includes("限流")) {
        console.log("触发限流，等待 10 秒...");
        await sleep(10000);
      }
    }

    // 每条之间稍微间隔，避免限流
    await sleep(300);
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功：${success} 条，失败：${failed} 条`);

  // 验证总数
  const chunkCount = await prisma.knowledgeChunk.count();
  console.log(`KnowledgeChunk 表总数：${chunkCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
