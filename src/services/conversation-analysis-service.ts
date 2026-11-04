// 客户综合分析服务（功能1/4/5/6 的提取层）
// 单次 JSON 模型调用完成：需求/顾虑识别 + 事实提取 + 矛盾检测 + 待办提取
// 结果持久化到 ConversationAnalysis，供回复生成复用，避免重复分析
import { prisma } from "@/lib/db";
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";
import { extractJson } from "@/lib/schemas";
import { toPlainJson } from "@/lib/utils";
import {
  ANALYSIS_V2_SYSTEM_PROMPT,
  buildAnalysisV2UserPrompt,
  type CustomerFieldKey,
} from "@/lib/v2-prompts";

// ---------- 类型定义 ----------
export interface PotentialConcern {
  concern: string;
  certainty: "FACT" | "HYPOTHESIS";
  evidence: string;
  confidence: number;
}

export interface CustomerFactDraft {
  fieldKey: string;
  value: string;
  factType: "CONFIRMED" | "INFERRED";
  confidence: number;
}

export interface Contradiction {
  fieldKey: string;
  newValue: string;
  previousValue: string;
  confirmPhrase: string;
}

export interface FollowUpDraft {
  title: string;
  taskType: "CUSTOMER_PROMISED" | "ADVISOR_PROMISED" | "AI_SUGGESTED";
  dueDate: string;
  evidence: string;
}

export interface ConversationAnalysisResult {
  currentQuestion: string;
  explicitNeeds: string[];
  potentialConcerns: PotentialConcern[];
  attitudeChange: string;
  stage: string;
  confirmedInfo: string[];
  needConfirmInfo: string[];
  recommendedDirection: string;
  customerFacts: CustomerFactDraft[];
  contradictions: Contradiction[];
  followUpItems: FollowUpDraft[];
}

export interface AnalysisOutcome {
  analysis: ConversationAnalysisResult;
  latencyMs: number;
  model: string;
  persisted: boolean;
}

const EMPTY_ANALYSIS: ConversationAnalysisResult = {
  currentQuestion: "",
  explicitNeeds: [],
  potentialConcerns: [],
  attitudeChange: "",
  stage: "",
  confirmedInfo: [],
  needConfirmInfo: [],
  recommendedDirection: "",
  customerFacts: [],
  contradictions: [],
  followUpItems: [],
};

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** 规范化模型输出，缺字段时安全降级，不抛错 */
function normalize(raw: unknown): ConversationAnalysisResult {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_ANALYSIS };
  const r = raw as Record<string, unknown>;

  const concerns = asArray<Record<string, unknown>>(r.potentialConcerns)
    .map((c): PotentialConcern => ({
      concern: asString(c.concern),
      certainty: c.certainty === "FACT" ? "FACT" : "HYPOTHESIS",
      evidence: asString(c.evidence),
      confidence: Number(c.confidence) || 0,
    }))
    .filter((c) => c.concern);

  const facts = asArray<Record<string, unknown>>(r.customerFacts)
    .map((f): CustomerFactDraft => ({
      fieldKey: asString(f.fieldKey),
      value: asString(f.value),
      factType: f.factType === "CONFIRMED" ? "CONFIRMED" : "INFERRED",
      confidence: Number(f.confidence) || 0,
    }))
    .filter((f) => f.fieldKey && f.value);

  const contradictions = asArray<Record<string, unknown>>(r.contradictions)
    .map((c) => ({
      fieldKey: asString(c.fieldKey),
      newValue: asString(c.newValue),
      previousValue: asString(c.previousValue),
      confirmPhrase: asString(c.confirmPhrase),
    }))
    .filter((c) => c.fieldKey);

  const followUpItems = asArray<Record<string, unknown>>(r.followUpItems)
    .map((f) => {
      const rawType = asString(f.taskType);
      const validTypes: FollowUpDraft["taskType"][] = [
        "CUSTOMER_PROMISED",
        "ADVISOR_PROMISED",
        "AI_SUGGESTED",
      ];
      return {
        title: asString(f.title),
        taskType: validTypes.includes(rawType as FollowUpDraft["taskType"])
          ? (rawType as FollowUpDraft["taskType"])
          : "AI_SUGGESTED",
        dueDate: asString(f.dueDate),
        evidence: asString(f.evidence),
      };
    })
    .filter((f) => f.title);

  return {
    currentQuestion: asString(r.currentQuestion),
    explicitNeeds: asArray<string>(r.explicitNeeds).map(asString).filter(Boolean),
    potentialConcerns: concerns,
    attitudeChange: asString(r.attitudeChange),
    stage: asString(r.stage),
    confirmedInfo: asArray<string>(r.confirmedInfo).map(asString).filter(Boolean),
    needConfirmInfo: asArray<string>(r.needConfirmInfo).map(asString).filter(Boolean),
    recommendedDirection: asString(r.recommendedDirection),
    customerFacts: facts,
    contradictions,
    followUpItems,
  };
}

/** 拼接对话为带角色的文本 */
export function formatDialogue(
  messages: { role: string; content: string }[]
): string {
  return messages
    .map((m) => `${m.role === "CUSTOMER" ? "客户" : m.role === "ADVISOR" ? "顾问" : "未知"}：${m.content}`)
    .join("\n");
}

/**
 * 执行客户综合分析并持久化。
 * @param force 是否强制重新分析（false 时复用该对话最近一次分析结果）
 */
export async function analyzeConversationV2(
  conversationId: string,
  userId: string,
  opts: { force?: boolean } = {}
): Promise<AnalysisOutcome> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置：请在环境变量中配置 ARK_API_KEY 与 ARK_TEXT_MODEL");
  }

  // 复用：非强制时，若该对话已有分析，直接返回
  if (!opts.force) {
    const existing = await prisma.conversationAnalysis.findFirst({
      where: { conversationId, userId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return {
        analysis: existing.analysis as unknown as ConversationAnalysisResult,
        latencyMs: existing.latencyMs ?? 0,
        model: existing.modelVersion ?? "",
        persisted: true,
      };
    }
  }

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
      { role: "system", content: ANALYSIS_V2_SYSTEM_PROMPT },
      { role: "user", content: buildAnalysisV2UserPrompt(dialogue) },
    ],
    temperature: 0.1,
    maxTokens: 1500,
    jsonMode: true,
    thinking: { type: "disabled" },
  });

  let parsed: ConversationAnalysisResult;
  try {
    parsed = normalize(extractJson(result.content));
  } catch (e) {
    console.error("分析结果 JSON 解析失败：", (e as Error).message, result.content.slice(0, 200));
    parsed = { ...EMPTY_ANALYSIS };
  }

  // 持久化，供回复生成与前端复用
  try {
    await prisma.conversationAnalysis.create({
      data: {
        userId,
        conversationId,
        analysis: toPlainJson(parsed),
        modelVersion: result.model,
        latencyMs: result.latencyMs,
      },
    });
  } catch (e) {
    console.error("分析结果持久化失败：", (e as Error).message);
    return { analysis: parsed, latencyMs: result.latencyMs, model: result.model, persisted: false };
  }

  return {
    analysis: parsed,
    latencyMs: result.latencyMs,
    model: result.model,
    persisted: true,
  };
}

export type { CustomerFieldKey };
