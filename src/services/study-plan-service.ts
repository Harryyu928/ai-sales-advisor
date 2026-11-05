// 语言备考路径服务（功能9）
// 结合客户档案或手动输入，调用 STUDY_PLAN 提示词生成可执行备考路径，持久化到 StudyPlan
// 规则：基础不明时模型应建议先测评；不承诺保分；写操作校验归属；解析失败安全降级
import { prisma } from "@/lib/db";
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";
import { extractJson } from "@/lib/schemas";
import { toPlainJson } from "@/lib/utils";
import { STUDY_PLAN_SYSTEM_PROMPT } from "@/lib/v2-prompts";

export interface StudyPhase {
  name: string;
  focus: string;
  milestone: string;
}

export interface StudyPlanData {
  goal: string;
  missingInfo: string[];
  assessmentAdvice: string;
  phases: StudyPhase[];
  risks: string[];
  wechatVersion: string;
}

export interface GenerateStudyPlanInput {
  customerId?: string | null;
  targetExam?: string;
  targetScore?: string;
  currentLevel?: string;
  plannedExamDate?: string;
  weeklyHours?: string;
  extraNote?: string;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** 规范化模型输出，缺字段安全降级 */
function normalize(raw: unknown): StudyPlanData {
  const empty: StudyPlanData = {
    goal: "",
    missingInfo: [],
    assessmentAdvice: "",
    phases: [],
    risks: [],
    wechatVersion: "",
  };
  if (typeof raw !== "object" || raw === null) return empty;
  const r = raw as Record<string, unknown>;

  return {
    goal: asString(r.goal),
    missingInfo: asArray<string>(r.missingInfo).map(asString).filter(Boolean),
    assessmentAdvice: asString(r.assessmentAdvice),
    phases: asArray<Record<string, unknown>>(r.phases)
      .map((p) => ({
        name: asString(p.name),
        focus: asString(p.focus),
        milestone: asString(p.milestone),
      }))
      .filter((p) => p.name || p.focus),
    risks: asArray<string>(r.risks).map(asString).filter(Boolean),
    wechatVersion: asString(r.wechatVersion),
  };
}

/** 从客户档案读取备考相关背景 */
async function buildCustomerBackground(
  userId: string,
  customerId: string
): Promise<{ background: string; customer: { id: string; code: string } }> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });
  if (!customer) throw new ApiError(404, "客户不存在或无权限");

  const lines: string[] = [];
  if (customer.targetExam) lines.push(`目标考试：${customer.targetExam}`);
  if (customer.targetScore) lines.push(`目标分数：${customer.targetScore}`);
  if (customer.existingScore) lines.push(`已有成绩：${customer.existingScore}`);
  if (customer.currentLevel) lines.push(`当前语言基础：${customer.currentLevel}`);
  if (customer.plannedExamDate) lines.push(`计划考试时间：${customer.plannedExamDate}`);
  if (customer.trainingNeeds) lines.push(`课程需求：${customer.trainingNeeds}`);

  return {
    background: lines.join("\n"),
    customer: { id: customer.id, code: customer.code ?? "未命名客户" },
  };
}

/** 拼接手动输入背景 */
function buildManualBackground(input: GenerateStudyPlanInput): string {
  const lines: string[] = [];
  if (input.targetExam?.trim()) lines.push(`目标考试：${input.targetExam.trim()}`);
  if (input.targetScore?.trim()) lines.push(`目标分数：${input.targetScore.trim()}`);
  if (input.currentLevel?.trim()) lines.push(`当前语言基础：${input.currentLevel.trim()}`);
  if (input.plannedExamDate?.trim()) lines.push(`计划考试时间：${input.plannedExamDate.trim()}`);
  if (input.weeklyHours?.trim()) lines.push(`每周可投入学习时间：${input.weeklyHours.trim()}`);
  if (input.extraNote?.trim()) lines.push(`补充说明：${input.extraNote.trim()}`);
  return lines.join("\n");
}

/** 生成备考路径并持久化 */
export async function generateStudyPlan(
  userId: string,
  input: GenerateStudyPlanInput
): Promise<{ plan: StudyPlanData; record: { id: string } }> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置");
  }

  let customerId: string | null = null;
  let conversationId: string | null = null;
  let background = "";

  if (input.customerId) {
    const result = await buildCustomerBackground(userId, input.customerId);
    customerId = result.customer.id;
    background = result.background;
    // 手动输入作为补充
    const manual = buildManualBackground(input);
    if (manual) background = background ? `${background}\n${manual}` : manual;

    const latestConv = await prisma.conversation.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    conversationId = latestConv?.id ?? null;
  } else {
    background = buildManualBackground(input);
  }

  if (!background.trim()) {
    throw new ApiError(400, "请至少提供目标考试或当前基础等信息");
  }

  const client = new ArkClient();
  const result = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: STUDY_PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: `请根据以下客户信息生成备考路径：\n\n${background}\n\n请严格按 JSON 结构输出。`,
      },
    ],
    temperature: 0.2,
    maxTokens: 1500,
    jsonMode: true,
    thinking: { type: "disabled" },
  });

  let plan: StudyPlanData;
  try {
    plan = normalize(extractJson(result.content));
  } catch (e) {
    console.error("备考方案 JSON 解析失败：", (e as Error).message);
    throw new ApiError(502, "备考方案生成失败，请重试");
  }

  const record = await prisma.studyPlan.create({
    data: {
      userId,
      customerId,
      conversationId,
      planData: toPlainJson(plan),
      wechatVersion: plan.wechatVersion || null,
      modelVersion: result.model,
    },
    select: { id: true },
  });

  return { plan, record };
}

/** 查询备考方案列表 */
export async function listStudyPlans(
  userId: string,
  customerId?: string | null
) {
  return prisma.studyPlan.findMany({
    where: {
      userId,
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { id: true, code: true } },
    },
  });
}

/** 查询单个方案（校验归属） */
export async function getStudyPlan(userId: string, id: string) {
  const record = await prisma.studyPlan.findFirst({
    where: { id, userId },
    include: { customer: { select: { id: true, code: true } } },
  });
  if (!record) throw new ApiError(404, "备考方案不存在或无权限");
  return record;
}

/** 删除备考方案 */
export async function deleteStudyPlan(userId: string, id: string) {
  await getStudyPlan(userId, id);
  await prisma.studyPlan.delete({ where: { id } });
  return { deleted: id };
}
