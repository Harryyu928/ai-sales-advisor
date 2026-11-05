// AI 回复生成服务
// V2.0：单次分析复用 + 知识/案例并行检索 + 一次生成 + 规则质检 + 全量持久化
// 保留旧版 generateReply / analyzeConversation 以兼容潜在引用，新流程走 generateReplyV2
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
import {
  buildGenerationV2SystemPrompt,
} from "@/lib/v2-prompts";
import {
  searchRelevantKnowledge,
  formatKnowledgeContext,
  type KnowledgeSnippet,
} from "@/services/knowledge-search";
import {
  analyzeConversationV2,
  formatDialogue,
  type ConversationAnalysisResult,
} from "@/services/conversation-analysis-service";
import { qualityCheck, type QualityCheckResult } from "@/services/quality-check";
import {
  searchSimilarSavedReplies,
  formatSavedReplyContext,
} from "@/services/saved-reply-service";
import { applyCustomerFacts, ensureCustomer, type ApplyFactsResult } from "@/services/customer-memory-service";
import { prisma } from "@/lib/db";
import { toPlainJson } from "@/lib/utils";

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

export interface KnowledgeReference {
  id: string;
  title: string;
  category: string;
  examType: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  effectiveDate: string | null;
  score: number;
}

export interface GenerateReplyV2Input {
  conversationId: string;
  userId: string;
  style: StylePreset;
  forceAnalysis?: boolean;
  applyMemory?: boolean; // 是否自动应用客户事实
}

export interface GenerateReplyV2Result {
  generationId: string;
  reply: string;
  style: StylePreset;
  styleLabel: string;
  analysis: ConversationAnalysisResult;
  quality: QualityCheckResult;
  knowledgeReferences: KnowledgeReference[];
  memory: ApplyFactsResult | null;
  timing: Record<string, number>;
  totalLatencyMs: number;
  model: string;
  customerId: string | null;
}

function toReference(s: KnowledgeSnippet): KnowledgeReference {
  return {
    id: s.id,
    title: s.title,
    category: s.category,
    examType: s.examType,
    sourceType: s.sourceType,
    sourceUrl: s.sourceUrl,
    verifiedAt: s.verifiedAt ? s.verifiedAt.toISOString() : null,
    effectiveDate: s.effectiveDate ? s.effectiveDate.toISOString() : null,
    score: s.score,
  };
}

/** 生成 AI 建议回复（旧版，保留兼容） */
export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置：请在 .env 中配置 ARK_API_KEY 与 ARK_TEXT_MODEL");
  }

  const style = input.style ?? "professional";
  const client = new ArkClient();

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

/** 分析客户意图与咨询阶段（旧版，保留兼容） */
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
  } catch {
    return {
      customerNeed: "",
      stage: "",
      keyInfo: [],
      nextStep: "",
      sentiment: "",
    };
  }
}

// ============================================================
// V2.0 主流程
// ============================================================
export async function generateReplyV2(
  input: GenerateReplyV2Input
): Promise<GenerateReplyV2Result> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置：请在环境变量中配置 ARK_API_KEY 与 ARK_TEXT_MODEL");
  }

  const totalStart = Date.now();
  const timing: Record<string, number> = {};

  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId, userId: input.userId },
    include: { messages: { orderBy: { sequence: "asc" } } },
  });
  if (!conversation) throw new ApiError(404, "对话不存在");

  const messages = conversation.messages.map((m) => ({
    role: m.senderRole,
    content: m.content ?? "",
    sequence: m.sequence,
  }));
  const lastCustomerMsg = [...messages].reverse().find((m) => m.role === "CUSTOMER");
  const queryText = lastCustomerMsg?.content ?? "";

  // 1. 三路并行：客户分析（复用）+ 知识检索 + 历史案例检索
  const parallelStart = Date.now();
  const [analysisOutcome, knowledgeSnippets, similarReplies] = await Promise.all([
    analyzeConversationV2(input.conversationId, input.userId, {
      force: input.forceAnalysis,
    }),
    queryText ? searchRelevantKnowledge(queryText) : Promise.resolve([]),
    queryText ? searchSimilarSavedReplies(queryText) : Promise.resolve([]),
  ]);
  timing.parallelRetrieval = Date.now() - parallelStart;

  const analysis: ConversationAnalysisResult = analysisOutcome.analysis;
  const knowledgeContext = formatKnowledgeContext(knowledgeSnippets);
  const savedReplyContext = formatSavedReplyContext(similarReplies);

  // 自动建档：对话尚未关联客户时，先建立客户档案，保证后续落库与记忆应用可关联
  let activeCustomerId: string | null = conversation.customerId;
  if (input.applyMemory && !activeCustomerId) {
    const contactFact = analysis.customerFacts.find((f) => f.fieldKey === "contactRole");
    activeCustomerId = await ensureCustomer(
      input.userId,
      contactFact?.value || "新客户",
      input.conversationId
    );
  }

  // 2. 一次生成回复（融入分析结论、知识、案例、风格）
  const genStart = Date.now();
  const style = input.style;
  const dialogue = formatDialogue(messages);
  const client = new ArkClient();
  const genResult = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: buildGenerationV2SystemPrompt(STYLE_PRESETS[style].instruction) },
      {
        role: "user",
        content:
          `对话主题：${conversation.title || "微信聊天"}\n\n对话记录：\n${dialogue}` +
          `\n\n客户分析结论（供你参考，区分事实与推测）：\n${JSON.stringify(analysis)}` +
          knowledgeContext +
          savedReplyContext +
          `\n\n请基于以上信息生成顾问下一步回复，只输出回复正文。`,
      },
    ],
    temperature: 0.7,
    maxTokens: 600,
    thinking: { type: "disabled" },
  });
  timing.generation = Date.now() - genStart;

  // 3. 规则质检（不调用模型），普通表达问题自动优化
  const qcStart = Date.now();
  const qc = qualityCheck(genResult.content.trim(), knowledgeSnippets.length > 0);
  timing.qualityCheck = Date.now() - qcStart;
  const finalReply = qc.autoFixed ? qc.finalText : genResult.content.trim();

  // 4. 持久化 ReplyGeneration（含质检、引用、耗时、四态基础）
  const persistStart = Date.now();
  const references = knowledgeSnippets.map(toReference);
  const generation = await prisma.replyGeneration.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId,
      customerId: activeCustomerId,
      inputSnapshot: toPlainJson({ messages }),
      replyText: finalReply,
      customerIntent: toPlainJson({
        currentQuestion: analysis.currentQuestion,
        explicitNeeds: analysis.explicitNeeds,
        potentialConcerns: analysis.potentialConcerns,
      }),
      salesStage: analysis.stage,
      nextAction: analysis.recommendedDirection,
      knowledgeReferences: toPlainJson(references),
      uncertaintyFlags: toPlainJson(
        analysis.potentialConcerns
          .filter((c) => c.certainty === "HYPOTHESIS")
          .map((c) => c.concern)
      ),
      qualityCheck: toPlainJson({
        passed: qc.passed,
        issues: qc.issues,
        warnings: qc.warnings,
        autoFixed: qc.autoFixed,
      }),
      timingBreakdown: toPlainJson(timing),
      modelVersion: genResult.model,
      latencyMs: genResult.latencyMs,
      status: "GENERATED",
    },
  });
  timing.persistence = Date.now() - persistStart;

  // 5. 自动应用客户事实记忆（建档后即可应用，含事实/推测分离与矛盾保护）
  let memory: ApplyFactsResult | null = null;
  if (input.applyMemory && activeCustomerId) {
    memory = await applyCustomerFacts(
      input.userId,
      activeCustomerId,
      input.conversationId,
      analysis.customerFacts,
      analysis.contradictions
    );
  }

  const totalLatencyMs = Date.now() - totalStart;
  timing.total = totalLatencyMs;

  return {
    generationId: generation.id,
    reply: finalReply,
    style,
    styleLabel: STYLE_PRESETS[style].label,
    analysis,
    quality: qc,
    knowledgeReferences: references,
    memory,
    timing,
    totalLatencyMs,
    model: genResult.model,
    customerId: activeCustomerId,
  };
}
