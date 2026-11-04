// 客户记忆服务（功能4/5）：客户事实的来源追踪、事实/推测区分、矛盾保护与历史保留
// 规则：
//   - 明确事实（CONFIRMED）可更新档案；推测（INFERRED）只记录、不覆盖档案
//   - 新的明确事实与历史确认值冲突时，双方标记 DISPUTED，等待人工确认，不擅自改历史
//   - 每次变更保留旧记录（SUPERSEDED），不物理删除
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import type { CustomerFactDraft, Contradiction } from "@/services/conversation-analysis-service";

// 允许同步到 Customer 快照的字段白名单（fieldKey → Customer 列名，当前一一对应）
const CUSTOMER_COLUMNS = [
  "contactRole",
  "applicationStage",
  "targetCountry",
  "targetSchool",
  "targetMajor",
  "targetExam",
  "targetScore",
  "existingScore",
  "currentLevel",
  "plannedExamDate",
  "plannedEnrollmentDate",
  "trainingNeeds",
  "budgetRange",
  "concerns",
  "confirmedNextStep",
] as const;

type CustomerColumn = (typeof CUSTOMER_COLUMNS)[number];

function isCustomerColumn(key: string): key is CustomerColumn {
  return (CUSTOMER_COLUMNS as readonly string[]).includes(key);
}

export interface AppliedFact {
  fieldKey: string;
  value: string;
  factType: string;
  action: "CREATED" | "UPDATED" | "SKIPPED" | "DISPUTED" | "INFERRED_RECORDED";
}

export interface ApplyFactsResult {
  customerId: string;
  applied: AppliedFact[];
  disputes: { fieldKey: string; previousValue: string; newValue: string }[];
}

/** 按需创建客户（未关联客户时不强制建档，由调用方决定是否调用） */
export async function ensureCustomer(
  userId: string,
  code: string,
  conversationId: string
): Promise<string> {
  const existing = await prisma.customer.findFirst({
    where: { conversations: { some: { id: conversationId } } },
  });
  if (existing) return existing.id;

  const customer = await prisma.customer.create({
    data: {
      userId,
      code: code || "未命名客户",
      salesStage: "初次咨询",
      conversations: { connect: { id: conversationId } },
    },
  });
  return customer.id;
}

/** 把某个确认值同步为 Customer 快照列 */
async function syncCustomerColumn(customerId: string, fieldKey: string, value: string) {
  if (!isCustomerColumn(fieldKey)) return;
  // 日期类字段在快照中尝试解析，解析失败则保留字符串到对应文本字段（这里统一存原文）
  await prisma.customer.update({
    where: { id: customerId },
    data: { [fieldKey]: value, lastContactAt: new Date() },
  });
}

/**
 * 应用从对话提取的客户事实。
 * @param facts 分析服务输出的 customerFacts
 * @param contradictions 分析服务输出的矛盾（用于补充提示，实际以库内状态为准）
 */
export async function applyCustomerFacts(
  userId: string,
  customerId: string,
  conversationId: string,
  facts: CustomerFactDraft[],
  contradictions: Contradiction[] = []
): Promise<ApplyFactsResult> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });
  if (!customer) throw new ApiError(404, "客户不存在或无权限");

  const applied: AppliedFact[] = [];
  const disputes: ApplyFactsResult["disputes"] = [];

  for (const fact of facts) {
    if (!fact.fieldKey || !fact.value) continue;

    const active = await prisma.customerFact.findFirst({
      where: { customerId, fieldKey: fact.fieldKey, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    // ---- 推测：只记录，不覆盖档案 ----
    if (fact.factType === "INFERRED") {
      if (active && active.factType === "CONFIRMED") {
        // 已有确认事实，推测无需记录，避免噪音
        applied.push({ fieldKey: fact.fieldKey, value: fact.value, factType: "INFERRED", action: "SKIPPED" });
        continue;
      }
      if (!active || active.value !== fact.value) {
        if (active) {
          await prisma.customerFact.update({ where: { id: active.id }, data: { status: "SUPERSEDED" } });
        }
        await prisma.customerFact.create({
          data: {
            userId,
            customerId,
            conversationId,
            fieldKey: fact.fieldKey,
            value: fact.value,
            factType: "INFERRED",
            sourceType: "conversation",
            confidence: fact.confidence,
            status: "ACTIVE",
          },
        });
        applied.push({ fieldKey: fact.fieldKey, value: fact.value, factType: "INFERRED", action: "INFERRED_RECORDED" });
      }
      continue;
    }

    // ---- 明确事实 ----
    if (!active) {
      await prisma.customerFact.create({
        data: {
          userId,
          customerId,
          conversationId,
          fieldKey: fact.fieldKey,
          value: fact.value,
          factType: "CONFIRMED",
          sourceType: "conversation",
          confidence: fact.confidence,
          status: "ACTIVE",
        },
      });
      await syncCustomerColumn(customerId, fact.fieldKey, fact.value);
      applied.push({ fieldKey: fact.fieldKey, value: fact.value, factType: "CONFIRMED", action: "CREATED" });
      continue;
    }

    if (active.value === fact.value) {
      applied.push({ fieldKey: fact.fieldKey, value: fact.value, factType: "CONFIRMED", action: "SKIPPED" });
      continue;
    }

    // 新确认值与当前 ACTIVE 不同 → 矛盾保护：不覆盖，标记待确认
    // 旧确认值进入 DISPUTED（保留，不删除），新值也以 DISPUTED 落库
    await prisma.customerFact.update({ where: { id: active.id }, data: { status: "DISPUTED" } });
    await prisma.customerFact.create({
      data: {
        userId,
        customerId,
        conversationId,
        fieldKey: fact.fieldKey,
        value: fact.value,
        factType: "CONFIRMED",
        sourceType: "conversation",
        confidence: fact.confidence,
        status: "DISPUTED",
        note: "新说法，待人工确认",
      },
    });
    disputes.push({ fieldKey: fact.fieldKey, previousValue: active.value, newValue: fact.value });
    applied.push({ fieldKey: fact.fieldKey, value: fact.value, factType: "CONFIRMED", action: "DISPUTED" });
  }

  // 分析侧已识别但库内未捕获的矛盾，补充进结果（不重复落库）
  for (const c of contradictions) {
    if (!disputes.some((d) => d.fieldKey === c.fieldKey)) {
      disputes.push({ fieldKey: c.fieldKey, previousValue: c.previousValue, newValue: c.newValue });
    }
  }

  return { customerId, applied, disputes };
}

/** 人工裁决矛盾：确认采用新值或保留旧值 */
export async function resolveDispute(
  userId: string,
  customerId: string,
  fieldKey: string,
  decision: "NEW" | "OLD",
  confirmedValue?: string
) {
  const records = await prisma.customerFact.findMany({
    where: { customerId, fieldKey, status: "DISPUTED" },
    orderBy: { createdAt: "asc" },
  });
  if (records.length < 2) throw new ApiError(400, "没有待确认的矛盾记录");
  const [oldRec, newRec] = records;

  if (decision === "NEW") {
    const value = confirmedValue || newRec.value;
    await prisma.customerFact.update({ where: { id: oldRec.id }, data: { status: "SUPERSEDED" } });
    await prisma.customerFact.update({
      where: { id: newRec.id },
      data: { status: "ACTIVE", value, factType: "CONFIRMED", sourceType: "confirmed", note: null },
    });
    await syncCustomerColumn(customerId, fieldKey, value);
    return { resolved: fieldKey, value };
  }

  await prisma.customerFact.update({
    where: { id: oldRec.id },
    data: { status: "ACTIVE", note: null },
  });
  await prisma.customerFact.update({ where: { id: newRec.id }, data: { status: "SUPERSEDED" } });
  return { resolved: fieldKey, value: oldRec.value };
}
