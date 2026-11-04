// 客户档案自动提取服务：从对话中提取客户信息，自动创建/更新客户记录
import { prisma } from "@/lib/db";
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";

export interface ExtractedCustomerInfo {
  code: string; // 客户代号
  targetExam: string; // 目标考试
  targetScore: string; // 目标分数
  currentLevel: string; // 当前水平
  applicationStage: string; // 申请阶段
  targetCountry: string; // 目标国家
  salesStage: string; // 销售阶段
  summary: string; // 咨询摘要
  concerns: string; // 主要顾虑
}

const EXTRACT_SYSTEM_PROMPT = `你是国际教育机构的客户档案助手。从微信对话中提取客户信息。
严格输出JSON格式，不要有多余文字：
{
  "code": "客户昵称或编号（从对话中提取，如'张同学'、'李妈妈'）",
  "targetExam": "目标考试（雅思/托福/PTE/多邻国/暂未确定）",
  "targetScore": "目标分数（如6.5、100分）",
  "currentLevel": "当前语言基础（如四级水平、大学英语）",
  "applicationStage": "申请阶段（如刚咨询/准备中/临近考试/已申请）",
  "targetCountry": "目标国家（如英国/澳洲/美国/香港）",
  "salesStage": "销售阶段（初次咨询/需求确认/方案讨论/价格敏感/即将签约/售后跟进）",
  "summary": "一句话咨询摘要（30字以内）",
  "concerns": "主要顾虑（如价格/时间/难度）"
}
如果某项信息对话中没有提到，填空字符串。`;

export async function extractCustomerFromConversation(
  conversationId: string,
  userId: string
): Promise<{ customerId: string; isNew: boolean; info: ExtractedCustomerInfo }> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置");
  }

  // 读取对话
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { sequence: "asc" } },
    },
  });
  if (!conversation) throw new ApiError(404, "对话不存在");

  // 拼接对话内容
  const dialogueText = conversation.messages
    .map((m) => `${m.senderRole === "CUSTOMER" ? "客户" : "顾问"}: ${m.content ?? ""}`)
    .join("\n");

  // 调用AI提取信息
  const client = new ArkClient();
  const result = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: EXTRACT_SYSTEM_PROMPT },
      { role: "user", content: `对话内容：\n${dialogueText}\n\n请提取客户信息：` },
    ],
    temperature: 0.1,
    maxTokens: 400,
    jsonMode: true,
  });

  // 解析JSON
  let raw = result.content.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) raw = jsonMatch[0];
  const parsed = JSON.parse(raw) as ExtractedCustomerInfo;

  // 检查是否已有客户（通过对话关联）
  let customer = conversation.customerId
    ? await prisma.customer.findUnique({ where: { id: conversation.customerId, userId } })
    : null;

  const isNew = !customer;

  if (customer) {
    // 更新已有客户（只更新非空字段）
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(parsed.targetExam && { targetExam: parsed.targetExam }),
        ...(parsed.targetScore && { targetScore: parsed.targetScore }),
        ...(parsed.currentLevel && { currentLevel: parsed.currentLevel }),
        ...(parsed.applicationStage && { applicationStage: parsed.applicationStage }),
        ...(parsed.targetCountry && { targetCountry: parsed.targetCountry }),
        ...(parsed.salesStage && { salesStage: parsed.salesStage }),
        ...(parsed.summary && { summary: parsed.summary }),
        ...(parsed.concerns && { concerns: parsed.concerns }),
        lastContactAt: new Date(),
      },
    });
  } else {
    // 创建新客户
    customer = await prisma.customer.create({
      data: {
        userId,
        code: parsed.code || "未命名客户",
        targetExam: parsed.targetExam || null,
        targetScore: parsed.targetScore || null,
        currentLevel: parsed.currentLevel || null,
        applicationStage: parsed.applicationStage || null,
        targetCountry: parsed.targetCountry || null,
        salesStage: parsed.salesStage || "初次咨询",
        summary: parsed.summary || null,
        concerns: parsed.concerns || null,
        lastContactAt: new Date(),
      },
    });

    // 把对话关联到客户
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { customerId: customer.id },
    });
  }

  return { customerId: customer.id, isNew, info: parsed };
}
