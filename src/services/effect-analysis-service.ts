// AI 回复效果分析服务（功能11）
// 聚合 ReplyGeneration / SavedReply / ReplyFeedback 的真实数据，计算关键指标，并用模型生成可执行洞察
// 规则：只基于真实数据；样本不足时提示；模型不可用时返回纯指标；校验归属
import { prisma } from "@/lib/db";
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";
import { extractJson } from "@/lib/schemas";
import { EFFECT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/v2-prompts";

export interface NameCount {
  name: string;
  count: number;
}

export interface EffectMetrics {
  total: number;
  failed: number;
  regenerated: number;
  qualityPassed: number;
  qualityPassRate: number;
  collected: number;
  collectRate: number;
  sent: number;
  sendRate: number;
  effective: number;
  effectiveRate: number;
  avgLatencyMs: number;
  avgReplyLength: number;
  qualityIssueCounts: NameCount[];
  stageCounts: NameCount[];
  savedReplyStatusCounts: NameCount[];
  dailyTrend: NameCount[];
}

export interface EffectInsight {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  actions: string[];
}

export interface EffectAnalysisResult {
  metrics: EffectMetrics;
  insight: EffectInsight | null;
}

interface QualityCheckShape {
  passed?: boolean;
  issues?: { code?: string }[];
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

function topCounts(map: Map<string, number>): NameCount[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** 计算全部统计指标 */
export async function buildEffectMetrics(userId: string): Promise<EffectMetrics> {
  const generations = await prisma.replyGeneration.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      status: true,
      isCollected: true,
      effectiveFlag: true,
      latencyMs: true,
      salesStage: true,
      replyText: true,
      qualityCheck: true,
      createdAt: true,
    },
  });

  const total = generations.filter((g) => g.status !== "FAILED").length;
  const failed = generations.filter((g) => g.status === "FAILED").length;
  const regenerated = generations.filter((g) => g.status === "REGENERATED").length;

  let qualityPassed = 0;
  let latencySum = 0;
  let latencyCount = 0;
  let lengthSum = 0;
  let collected = 0;
  let effective = 0;
  const issueMap = new Map<string, number>();
  const stageMap = new Map<string, number>();

  // 近 14 天趋势
  const trendMap = new Map<string, number>();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    trendMap.set(dateKey(d), 0);
  }

  for (const g of generations) {
    if (g.isCollected) collected += 1;
    if (g.effectiveFlag) effective += 1;

    if (typeof g.latencyMs === "number") {
      latencySum += g.latencyMs;
      latencyCount += 1;
    }
    lengthSum += g.replyText?.length ?? 0;

    const qc = g.qualityCheck as QualityCheckShape | null;
    if (qc?.passed) qualityPassed += 1;
    if (Array.isArray(qc?.issues)) {
      for (const issue of qc.issues) {
        const code = issue.code || "UNKNOWN";
        issueMap.set(code, (issueMap.get(code) ?? 0) + 1);
      }
    }

    if (g.salesStage) {
      stageMap.set(g.salesStage, (stageMap.get(g.salesStage) ?? 0) + 1);
    }

    if (g.status !== "FAILED") {
      const key = dateKey(g.createdAt);
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
      }
    }
  }

  // 实际发送数：ReplyFeedback 中 sentAt 非空
  const sent = await prisma.replyFeedback.count({
    where: { userId, sentAt: { not: null } },
  });

  // SavedReply 状态分布
  const savedReplies = await prisma.savedReply.findMany({
    where: { userId },
    select: { status: true },
    take: 2000,
  });
  const savedStatusMap = new Map<string, number>();
  for (const s of savedReplies) {
    savedStatusMap.set(s.status, (savedStatusMap.get(s.status) ?? 0) + 1);
  }

  return {
    total,
    failed,
    regenerated,
    qualityPassed,
    qualityPassRate: pct(qualityPassed, total),
    collected,
    collectRate: pct(collected, total),
    sent,
    sendRate: pct(sent, total),
    effective,
    effectiveRate: pct(effective, total),
    avgLatencyMs: latencyCount ? Math.round(latencySum / latencyCount) : 0,
    avgReplyLength: total ? Math.round(lengthSum / total) : 0,
    qualityIssueCounts: topCounts(issueMap),
    stageCounts: topCounts(stageMap),
    savedReplyStatusCounts: topCounts(savedStatusMap),
    dailyTrend: Array.from(trendMap.entries()).map(([name, count]) => ({ name, count })),
  };
}

function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeInsight(raw: unknown): EffectInsight {
  const empty: EffectInsight = { summary: "", strengths: [], weaknesses: [], actions: [] };
  if (typeof raw !== "object" || raw === null) return empty;
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  return {
    summary: typeof r.summary === "string" ? r.summary : "",
    strengths: arr(r.strengths),
    weaknesses: arr(r.weaknesses),
    actions: arr(r.actions),
  };
}

/** 完整分析：指标 + 模型洞察 */
export async function getEffectAnalysis(userId: string): Promise<EffectAnalysisResult> {
  const metrics = await buildEffectMetrics(userId);

  let insight: EffectInsight | null = null;

  if (isArkTextConfigured()) {
    try {
      const client = new ArkClient();
      const result = await client.chat({
        model: process.env.ARK_TEXT_MODEL!,
        messages: [
          { role: "system", content: EFFECT_ANALYSIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: `以下是真实统计数据：\n${JSON.stringify(metrics)}\n\n请严格按 JSON 输出分析。`,
          },
        ],
        temperature: 0.2,
        maxTokens: 1200,
        jsonMode: true,
        thinking: { type: "disabled" },
      });
      insight = normalizeInsight(extractJson(result.content));
    } catch (e) {
      console.error("效果分析洞察生成失败：", (e as Error).message);
    }
  }

  return { metrics, insight };
}
