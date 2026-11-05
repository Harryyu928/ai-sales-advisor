// /api/follow-ups —— 跟进待办列表（GET）、新建（POST）；summary=1 返回概览统计
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import {
  createManualTask,
  listTasks,
  getFollowUpSummary,
  type FollowUpStatus,
  type FollowUpTaskType,
} from "@/services/follow-up-service";

const VALID_STATUSES: FollowUpStatus[] = ["PENDING", "DONE", "CANCELLED"];
const VALID_SCOPES = ["overdue", "today", "week", "all"];
const VALID_TYPES: FollowUpTaskType[] = ["CUSTOMER_PROMISED", "ADVISOR_PROMISED", "AI_SUGGESTED"];

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const url = new URL(req.url);

    if (url.searchParams.get("summary") === "1") {
      const summary = await getFollowUpSummary(user.id);
      return NextResponse.json({ ok: true, data: summary });
    }

    const statusParam = url.searchParams.get("status");
    const scopeParam = url.searchParams.get("scope");
    const q = url.searchParams.get("q");

    const status = statusParam && VALID_STATUSES.includes(statusParam as FollowUpStatus)
      ? (statusParam as FollowUpStatus)
      : undefined;
    const scope = scopeParam && VALID_SCOPES.includes(scopeParam)
      ? (scopeParam as ListScope)
      : undefined;

    const tasks = await listTasks(user.id, {
      status,
      scope,
      q: q ?? undefined,
    });
    return NextResponse.json({ ok: true, data: tasks });
  });
}

type ListScope = "overdue" | "today" | "week" | "all";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title : "";
    if (!title.trim()) throw new ApiError(400, "待办标题不能为空");

    const taskType = body.taskType && VALID_TYPES.includes(body.taskType)
      ? (body.taskType as FollowUpTaskType)
      : undefined;

    const task = await createManualTask(user.id, {
      title,
      description: typeof body.description === "string" ? body.description : undefined,
      taskType,
      dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
      customerId: typeof body.customerId === "string" ? body.customerId : null,
      conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
    });

    return NextResponse.json({ ok: true, data: task }, { status: 201 });
  });
}
