// 客户跟进提醒服务（功能8）
// 职责：把分析输出的 followUpItems 落地为 FollowUpTask；手动 CRUD；状态流转；到期统计
// 规则：所有写操作校验 userId 归属；同对话同标题未完成任务去重；不物理删除历史关联
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import type { FollowUpDraft } from "@/services/conversation-analysis-service";

export type FollowUpStatus = "PENDING" | "DONE" | "CANCELLED";
export type FollowUpTaskType = "CUSTOMER_PROMISED" | "ADVISOR_PROMISED" | "AI_SUGGESTED";

const VALID_TYPES: FollowUpTaskType[] = ["CUSTOMER_PROMISED", "ADVISOR_PROMISED", "AI_SUGGESTED"];

/** 解析 YYYY-MM-DD 为当天 09:00 的 Date；非法/空值返回 null（不编造日期） */
export function parseDueDate(raw: string | null | undefined): Date | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T09:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 从分析结果落地待办（去重），在回复主流程中调用 */
export async function createTasksFromAnalysis(
  userId: string,
  customerId: string | null,
  conversationId: string,
  items: FollowUpDraft[]
): Promise<{ createdCount: number; skippedCount: number }> {
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const title = item.title?.trim();
    if (!title) {
      skippedCount++;
      continue;
    }

    // 去重：同对话、同标题、仍未完成
    const dup = await prisma.followUpTask.findFirst({
      where: { userId, conversationId, title, status: "PENDING" },
    });
    if (dup) {
      skippedCount++;
      continue;
    }

    await prisma.followUpTask.create({
      data: {
        userId,
        customerId,
        conversationId,
        title,
        taskType: VALID_TYPES.includes(item.taskType) ? item.taskType : "AI_SUGGESTED",
        source: "AUTO",
        dueDate: parseDueDate(item.dueDate),
        description: item.evidence?.trim() || null,
        status: "PENDING",
      },
    });
    createdCount++;
  }

  return { createdCount, skippedCount };
}

export interface CreateManualTaskInput {
  title: string;
  description?: string | null;
  taskType?: FollowUpTaskType;
  dueDate?: string | null;
  customerId?: string | null;
  conversationId?: string | null;
}

/** 手动新建待办 */
export async function createManualTask(userId: string, input: CreateManualTaskInput) {
  const title = input.title?.trim();
  if (!title) throw new ApiError(400, "待办标题不能为空");
  if (title.length > 200) throw new ApiError(400, "待办标题过长");

  // 校验关联客户归属
  let customerId: string | null = null;
  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, userId },
    });
    if (!customer) throw new ApiError(404, "关联客户不存在");
    customerId = customer.id;
  }

  let conversationId: string | null = null;
  if (input.conversationId) {
    const conv = await prisma.conversation.findFirst({
      where: { id: input.conversationId, userId },
    });
    if (!conv) throw new ApiError(404, "关联对话不存在");
    conversationId = conv.id;
  }

  const taskType = input.taskType && VALID_TYPES.includes(input.taskType) ? input.taskType : "AI_SUGGESTED";

  return prisma.followUpTask.create({
    data: {
      userId,
      title,
      description: input.description?.trim() || null,
      taskType,
      source: "MANUAL",
      dueDate: parseDueDate(input.dueDate),
      customerId,
      conversationId,
      status: "PENDING",
    },
  });
}

export interface ListTasksOptions {
  status?: FollowUpStatus;
  scope?: "overdue" | "today" | "week" | "all";
  q?: string;
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0);
}

/** 查询待办列表（默认按到期日升序，无日期排后） */
export async function listTasks(userId: string, opts: ListTasksOptions = {}) {
  const where: Record<string, unknown> = { userId };
  if (opts.status) where.status = opts.status;

  const today = startOfToday();
  if (opts.scope && opts.scope !== "all") {
    if (opts.scope === "overdue") {
      where.dueDate = { lt: today };
      where.status = "PENDING";
    } else if (opts.scope === "today") {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      where.dueDate = { gte: today, lte: end };
      where.status = "PENDING";
    } else if (opts.scope === "week") {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      where.dueDate = { gte: today, lte: end };
      where.status = "PENDING";
    }
  }

  if (opts.q?.trim()) {
    where.OR = [
      { title: { contains: opts.q.trim(), mode: "insensitive" } },
      { description: { contains: opts.q.trim(), mode: "insensitive" } },
    ];
  }

  return prisma.followUpTask.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: {
      customer: { select: { id: true, code: true } },
    },
  });
}

/** 校验归属并返回任务 */
async function getOwnedTask(userId: string, id: string) {
  const task = await prisma.followUpTask.findFirst({ where: { id, userId } });
  if (!task) throw new ApiError(404, "待办不存在或无权限");
  return task;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  taskType?: FollowUpTaskType;
  dueDate?: string | null;
  status?: FollowUpStatus;
}

/** 更新待办（标题/描述/类型/日期/状态） */
export async function updateTask(userId: string, id: string, patch: UpdateTaskInput) {
  const existing = await getOwnedTask(userId, id);
  const data: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new ApiError(400, "待办标题不能为空");
    if (title.length > 200) throw new ApiError(400, "待办标题过长");
    data.title = title;
  }

  if (patch.description !== undefined) data.description = patch.description?.trim() || null;

  if (patch.taskType !== undefined) {
    if (!VALID_TYPES.includes(patch.taskType)) throw new ApiError(400, "无效的待办类型");
    data.taskType = patch.taskType;
  }

  if (patch.dueDate !== undefined) data.dueDate = parseDueDate(patch.dueDate);

  if (patch.status !== undefined) {
    if (!["PENDING", "DONE", "CANCELLED"].includes(patch.status)) {
      throw new ApiError(400, "无效的状态");
    }
    data.status = patch.status;
    if (patch.status === "DONE") {
      data.completedAt = existing.status === "DONE" ? existing.completedAt : new Date();
    } else if (patch.status === "PENDING") {
      data.completedAt = null;
    } else if (patch.status === "CANCELLED") {
      data.completedAt = null;
    }
  }

  return prisma.followUpTask.update({ where: { id }, data });
}

/** 删除待办（物理删除，用户显式操作） */
export async function deleteTask(userId: string, id: string) {
  await getOwnedTask(userId, id);
  await prisma.followUpTask.delete({ where: { id } });
  return { deleted: id };
}

export interface FollowUpSummary {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  pending: number;
  done: number;
}

/** 待办概览统计（用于页面顶部提醒卡片） */
export async function getFollowUpSummary(userId: string): Promise<FollowUpSummary> {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [overdue, dueToday, dueThisWeek, pending, done] = await Promise.all([
    prisma.followUpTask.count({
      where: { userId, status: "PENDING", dueDate: { lt: today } },
    }),
    prisma.followUpTask.count({
      where: {
        userId,
        status: "PENDING",
        dueDate: { gte: today, lt: tomorrow },
      },
    }),
    prisma.followUpTask.count({
      where: { userId, status: "PENDING", dueDate: { gte: today, lte: weekEnd } },
    }),
    prisma.followUpTask.count({ where: { userId, status: "PENDING" } }),
    prisma.followUpTask.count({ where: { userId, status: "DONE" } }),
  ]);

  return { overdue, dueToday, dueThisWeek, pending, done };
}
