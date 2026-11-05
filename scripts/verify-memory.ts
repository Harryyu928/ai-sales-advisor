// 客户记忆端到端验证：确认自动建档后 Customer 快照、CustomerFact、对话/生成关联均正确
// 运行：npx tsx --env-file=.env.local scripts/verify-memory.ts
import { prisma } from "../src/lib/db";

const customerId = "cmw2xt5vc000bzjithm63r0h3";

async function main() {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  console.log("=== Customer 快照 ===");
  console.log(JSON.stringify({
    code: customer?.code,
    salesStage: customer?.salesStage,
    applicationStage: customer?.applicationStage,
    targetCountry: customer?.targetCountry,
    targetSchool: customer?.targetSchool,
    targetMajor: customer?.targetMajor,
    currentLevel: customer?.currentLevel,
    budgetRange: customer?.budgetRange,
    concerns: customer?.concerns,
  }, null, 2));

  const facts = await prisma.customerFact.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n=== CustomerFact 记录（共 " + facts.length + " 条）===");
  for (const f of facts) {
    console.log(`[${f.status}] ${f.fieldKey} = ${f.value}  (${f.factType}, conf=${f.confidence})`);
  }

  const conv = await prisma.conversation.findFirst({
    where: { customerId },
    select: { id: true, title: true, customerId: true },
  });
  console.log("\n=== 关联对话 ===");
  console.log(JSON.stringify(conv));

  const gen = await prisma.replyGeneration.findFirst({
    where: { customerId },
    select: { id: true, customerId: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\n=== 最新 ReplyGeneration ===");
  console.log(JSON.stringify(gen));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
