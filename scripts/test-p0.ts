// P0 端到端测试：构造贴近真实的咨询场景，验证分析/质检/引用/持久化/记忆
// 运行：npx tsx scripts/test-p0.ts
import { prisma } from "../src/lib/db";
import { generateReplyV2 } from "../src/services/reply-service";

const USER_ID = "admin-local-001";

async function main() {
  // 1. 构造测试对话
  const conv = await prisma.conversation.create({
    data: {
      userId: USER_ID,
      title: "P0测试-雅思价格顾虑",
      source: "text",
    },
  });

  const rows: { role: "CUSTOMER" | "ADVISOR"; content: string }[] = [
    { role: "CUSTOMER", content: "老师您好，我想咨询一下雅思课程" },
    { role: "ADVISOR", content: "您好呀，请问您目前基础怎么样，目标分数是多少呢？" },
    { role: "CUSTOMER", content: "我现在大四，英语四级水平，目标是雅思6.5，想去英国读研" },
    { role: "ADVISOR", content: "明白，6.5是很多英国硕士的语言线。您打算什么时候考试呀？" },
    { role: "CUSTOMER", content: "我打算明年3月考，预算大概2万以内。你们课程有点贵，我再看看吧" },
  ];

  for (let i = 0; i < rows.length; i++) {
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderRole: rows[i].role,
        content: rows[i].content,
        sequence: i + 1,
      },
    });
  }

  console.log("已创建测试对话：", conv.id, "\n");

  // 2. 调用完整 V2 流程（未关联客户，先不应用记忆）
  const result = await generateReplyV2({
    conversationId: conv.id,
    userId: USER_ID,
    style: "natural",
    applyMemory: false,
  });

  console.log("===== 最终回复 =====");
  console.log(result.reply);
  console.log("\n===== 质检 =====");
  console.log("通过：", result.quality.passed, "| 自动优化：", result.quality.autoFixed);
  console.log("严重问题：", result.quality.issues.map((i) => i.message));
  console.log("警告：", result.quality.warnings.map((i) => i.message));

  console.log("\n===== 分析：顾虑（区分事实/推测）=====");
  for (const c of result.analysis.potentialConcerns) {
    console.log(`[${c.certainty}] ${c.concern}（依据：${c.evidence}）`);
  }
  console.log("显性需求：", result.analysis.explicitNeeds);
  console.log("咨询阶段：", result.analysis.stage);
  console.log("沟通方向：", result.analysis.recommendedDirection);

  console.log("\n===== 知识引用 =====");
  console.log("引用数量：", result.knowledgeReferences.length);
  for (const r of result.knowledgeReferences) {
    console.log(`- ${r.title}（${r.sourceType}，核实${r.verifiedAt?.slice(0, 10)}）`);
  }

  console.log("\n===== 各环节耗时(ms) =====");
  console.log(result.timing);

  // 验证持久化
  const persisted = await prisma.replyGeneration.findUnique({
    where: { id: result.generationId },
  });
  console.log("\n===== 持久化验证 =====");
  console.log("ReplyGeneration 已保存：", !!persisted, "| 状态：", persisted?.status);

  const analysisCount = await prisma.conversationAnalysis.count({
    where: { conversationId: conv.id },
  });
  console.log("ConversationAnalysis 记录数：", analysisCount);

  console.log("\n✅ P0 测试完成");
}

main()
  .catch((e) => {
    console.error("❌ 测试失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
