import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      "postgresql://postgres.npylkrsppckumxbnoyez:EZjttGC2v9RviU0m@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  }),
});

async function main() {
  const count = await prisma.knowledgeDocument.count();
  console.log("云端知识库数量：", count);

  // 按分类统计
  const categories = await prisma.knowledgeDocument.groupBy({
    by: ["category"],
    _count: true,
  });
  console.log("\n按分类：");
  categories.forEach((c) => {
    console.log(`  ${c.category}: ${c._count}条`);
  });

  // 用户数量
  const userCount = await prisma.user.count();
  console.log("\n用户数量：", userCount);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
