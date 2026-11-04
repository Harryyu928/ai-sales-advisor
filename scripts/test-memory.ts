// 客户记忆规则测试（功能4/5）：事实更新、推测不覆盖、矛盾保护、人工裁决
// 运行：npx tsx --env-file=.env scripts/test-memory.ts
import { prisma } from "../src/lib/db";
import {
  applyCustomerFacts, resolveDispute,
} from "../src/services/customer-memory-service";
import type { CustomerFactDraft } from "../src/services/conversation-analysis-service";

const USER_ID = "admin-local-001";

function fact(fieldKey: string, value: string, factType: "CONFIRMED" | "INFERRED", confidence = 0.9): CustomerFactDraft {
  return { fieldKey, value, factType, confidence };
}

async function main() {
  // 1. 建客户 + 对话
  const customer = await prisma.customer.create({
    data: { userId: USER_ID, code: "记忆测试客户", salesStage: "初次咨询" },
  });
  const conv = await prisma.conversation.create({
    data: { userId: USER_ID, title: "记忆测试对话", source: "text", customerId: customer.id },
  });

  // 2. 首次应用：确认事实 + 一个推测
  const r1 = await applyCustomerFacts(USER_ID, customer.id, conv.id, [
    fact("targetExam", "雅思", "CONFIRMED"),
    fact("targetScore", "6.5", "CONFIRMED"),
    fact("targetCountry", "英国", "INFERRED", 0.6),
  ]);
  console.log("首次应用动作：", r1.applied.map((a) => `${a.fieldKey}:${a.action}`));

  let cust = await prisma.customer.findUnique({ where: { id: customer.id } });
  console.log("快照同步：targetExam=", cust?.targetExam, "targetScore=", cust?.targetScore,
    "targetCountry(推测不应同步)=", cust?.targetCountry);

  // 3. 推测再次出现且已有确认值 → 应 SKIPPED
  const r2 = await applyCustomerFacts(USER_ID, customer.id, conv.id, [
    fact("targetExam", "雅思", "INFERRED", 0.5),
  ]);
  console.log("已有确认值时的推测：", r2.applied.map((a) => a.action));

  // 4. 矛盾：新确认目标分数 7.0，与现有 6.5 冲突
  const r3 = await applyCustomerFacts(USER_ID, customer.id, conv.id, [
    fact("targetScore", "7.0", "CONFIRMED"),
  ]);
  console.log("矛盾处理：", r3.applied.map((a) => `${a.fieldKey}:${a.action}`));
  console.log("disputes：", r3.disputes);

  cust = await prisma.customer.findUnique({ where: { id: customer.id } });
  console.log("矛盾期间快照应保持旧值6.5：targetScore=", cust?.targetScore);

  const factsDuring = await prisma.customerFact.findMany({
    where: { customerId: customer.id, fieldKey: "targetScore" },
  });
  console.log("两条记录状态：", factsDuring.map((f) => `${f.value}=${f.status}`));

  // 5. 人工裁决采用新值
  const resolved = await resolveDispute(USER_ID, customer.id, "targetScore", "NEW");
  console.log("裁决结果：", resolved);
  cust = await prisma.customer.findUnique({ where: { id: customer.id } });
  console.log("裁决后快照更新为：targetScore=", cust?.targetScore);

  const factsAfter = await prisma.customerFact.findMany({
    where: { customerId: customer.id, fieldKey: "targetScore" },
  });
  console.log("裁决后记录状态：", factsAfter.map((f) => `${f.value}=${f.status}`));

  // 清理测试数据
  await prisma.customerFact.deleteMany({ where: { customerId: customer.id } });
  await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log("\n✅ 客户记忆测试完成，测试数据已清理");
}

main().catch((e) => {
  console.error("❌ 测试失败：", e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
