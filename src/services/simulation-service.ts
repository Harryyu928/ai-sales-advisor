// 多轮客户沟通模拟服务（功能10）
// 基于顾问准备发送的回复，模拟客户可能的 2-3 种反应及接话建议，帮助顾问提前准备
// 规则：结果仅为推测，需带 disclaimer；解析失败安全降级；校验对话归属
import { prisma } from "@/lib/db";
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";
import { extractJson } from "@/lib/schemas";
import { formatDialogue } from "@/services/conversation-analysis-service";
import { SIMULATION_SYSTEM_PROMPT } from "@/lib/v2-prompts";

export interface SimulationResponse {
  tendency: string;
  customerReply: string;
  advisorTip: string;
}

export interface SimulationResult {
  disclaimer: string;
  responses: SimulationResponse[];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** 规范化模型输出，缺字段安全降级 */
function normalize(raw: unknown): SimulationResult {
  const empty: SimulationResult = { disclaimer: "", responses: [] };
  if (typeof raw !== "object" || raw === null) return empty;
  const r = raw as Record<string, unknown>;

  const responses = (Array.isArray(r.responses) ? r.responses : [])
    .map((item) => {
      const x = item as Record<string, unknown>;
      return {
        tendency: asString(x.tendency),
        customerReply: asString(x.customerReply),
        advisorTip: asString(x.advisorTip),
      };
    })
    .filter((x) => x.customerReply || x.tendency);

  return {
    disclaimer: asString(r.disclaimer) || "模拟结果仅用于沟通准备，不代表客户真实意图",
    responses,
  };
}

/**
 * 模拟客户反应
 * @param conversationId 对话（提供上下文）
 * @param draftReply 顾问准备发送的回复
 */
export async function simulateCustomerReply(
  userId: string,
  conversationId: string,
  draftReply: string
): Promise<SimulationResult> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置");
  }

  const reply = draftReply.trim();
  if (!reply) throw new ApiError(400, "请先提供准备发送的回复");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { sequence: "asc" } } },
  });
  if (!conversation) throw new ApiError(404, "对话不存在");

  const dialogue = formatDialogue(
    conversation.messages.map((m) => ({
      role: m.senderRole,
      content: m.content ?? "",
    }))
  );

  const client = new ArkClient();
  const result = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: SIMULATION_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `已有对话上下文：\n${dialogue}\n\n` +
          `顾问准备发送的回复：\n${reply}\n\n` +
          `请模拟客户看到这条回复后可能的反应，严格按 JSON 输出。`,
      },
    ],
    temperature: 0.6,
    maxTokens: 1200,
    jsonMode: true,
    thinking: { type: "disabled" },
  });

  try {
    return normalize(extractJson(result.content));
  } catch (e) {
    console.error("模拟结果 JSON 解析失败：", (e as Error).message);
    throw new ApiError(502, "模拟结果生成失败，请重试");
  }
}
