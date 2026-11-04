// AI 回复生成服务：调用豆包文本模型生成建议回复
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildAnalyzeUserPrompt,
  ANALYZE_SYSTEM_PROMPT,
  STYLE_PRESETS,
  type StylePreset,
} from "@/lib/reply-prompts";
import { searchRelevantKnowledge, formatKnowledgeContext } from "@/services/knowledge-search";

export interface GenerateReplyInput {
  conversationTitle: string;
  messages: { role: "ADVISOR" | "CUSTOMER" | "UNKNOWN"; content: string; sequence: number }[];
  style?: StylePreset;
  extraContext?: string;
}

export interface GenerateReplyResult {
  reply: string;
  style: StylePreset;
  styleLabel: string;
  latencyMs: number;
  model: string;
}

export interface AnalyzeResult {
  customerNeed: string;
  stage: string;
  keyInfo: string[];
  nextStep: string;
  sentiment: string;
}

/** 生成 AI 建议回复 */
export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置：请在 .env 中配置 ARK_API_KEY 与 ARK_TEXT_MODEL");
  }

  const style = input.style ?? "professional";
  const client = new ArkClient();

  // RAG：从知识库检索与客户问题相关的内容
  const lastCustomerMsg = [...input.messages].reverse().find((m) => m.role === "CUSTOMER");
  let knowledgeContext = "";
  if (lastCustomerMsg) {
    const snippets = await searchRelevantKnowledge(lastCustomerMsg.content);
    knowledgeContext = formatKnowledgeContext(snippets);
  }

  const result = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: buildSystemPrompt(style) },
      { role: "user", content: buildUserPrompt(input) + knowledgeContext },
    ],
    temperature: 0.7,
    maxTokens: 500,
  });

  return {
    reply: result.content.trim(),
    style,
    styleLabel: STYLE_PRESETS[style].label,
    latencyMs: result.latencyMs,
    model: result.model,
  };
}

/** 分析客户意图与咨询阶段 */
export async function analyzeConversation(
  messages: { role: string; content: string }[]
): Promise<AnalyzeResult> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置");
  }

  const client = new ArkClient();
  const result = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: ANALYZE_SYSTEM_PROMPT },
      { role: "user", content: buildAnalyzeUserPrompt(messages) },
    ],
    temperature: 0.1,
    maxTokens: 500,
    jsonMode: true,
  });

  try {
    // 尝试从返回内容中提取 JSON（有时模型会包裹在 markdown 代码块里）
    let raw = result.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];
    const parsed = JSON.parse(raw);
    return {
      customerNeed: parsed.customerNeed ?? "",
      stage: parsed.stage ?? "",
      keyInfo: Array.isArray(parsed.keyInfo) ? parsed.keyInfo : [],
      nextStep: parsed.nextStep ?? "",
      sentiment: parsed.sentiment ?? "",
    };
  } catch (e) {
    console.error("Analyze JSON parse failed:", result.content.slice(0, 200));
    return {
      customerNeed: "",
      stage: "",
      keyInfo: [],
      nextStep: "",
      sentiment: "",
    };
  }
}
