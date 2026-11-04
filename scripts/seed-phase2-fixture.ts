// 第二阶段 API 实测夹具：创建独立测试账号 + 通过真实服务层保存一条带重叠消息的对话
// 用法：npx tsx scripts/seed-phase2-fixture.ts（幂等，可重复执行；完成后可用 psql 清理）
import "dotenv/config";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { saveConversation, getConversationDetail } from "@/services/conversation-service";

async function main() {
  // 幂等：先删除既有测试账号（级联清理其对话/截图/会话）
  await prisma.user.deleteMany({ where: { email: "test.phase2@example.com" } });

  const user = await prisma.user.create({
    data: {
      email: "test.phase2@example.com",
      passwordHash: await hashPassword("phase2test123"),
      name: "阶段二测试顾问",
      role: "ADVISOR",
    },
  });

  // 两张截图资产（不落真实文件，识别流程不经过它们）
  const a1 = await prisma.screenshotAsset.create({
    data: { userId: user.id, originalName: "s1.png", mimeType: "image/png", sizeBytes: 100, storagePath: "fixture/s1.png", status: "UPLOADED" },
  });
  const a2 = await prisma.screenshotAsset.create({
    data: { userId: user.id, originalName: "s2.png", mimeType: "image/png", sizeBytes: 100, storagePath: "fixture/s2.png", status: "UPLOADED" },
  });

  // 通过真实服务层保存（含相邻重复合并）：A, B, B, C, D → A, B, C, D
  const { conversationId } = await saveConversation({
    userId: user.id,
    title: "雅思课程咨询（夹具）",
    assetIds: [a1.id, a2.id],
    messages: [
      { order: 1, sender_role: "customer", content: "你好，想了解雅思课程", timestamp: "2026-11-03 10:00", source_image_index: 1 },
      { order: 2, sender_role: "advisor", content: "您好！方便说下目前基础吗？", timestamp: "2026-11-03 10:02", source_image_index: 1 },
      { order: 3, sender_role: "advisor", content: "您好！方便说下目前基础吗？", timestamp: "2026-11-03 10:02", source_image_index: 2 },
      { order: 4, sender_role: "customer", content: "基础一般，目标是6.5", timestamp: "2026-11-03 10:05", source_image_index: 2 },
      { order: 5, sender_role: "customer", content: "基础一般，目标是6.5", timestamp: "2026-11-03 10:05", source_image_index: 2 },
      { order: 6, sender_role: "advisor", content: "收到，稍后给您一份备考规划", timestamp: "2026-11-03 10:08", source_image_index: 2 },
    ],
    uncertainties: ["截图2 开头存在与截图1 重叠的区域，已自动去重"],
    model: "fixture-model",
    latencyMs: 1234,
  });

  const detail = await getConversationDetail(user.id, conversationId);
  console.log(
    JSON.stringify(
      {
        userId: user.id,
        conversationId,
        messageCount: detail.messages.length,
        messages: detail.messages.map((m) => ({
          sequence: m.sequence,
          role: m.senderRole,
          content: m.content,
          manuallyCorrected: m.manuallyCorrected,
        })),
        title: detail.title,
        recognitionMeta: detail.recognitionMeta,
      },
      null,
      2
    )
  );
  console.log("FIXTURE_READY");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
