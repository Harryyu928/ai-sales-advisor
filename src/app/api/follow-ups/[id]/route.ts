// /api/follow-ups/[id] —— 更新待办（PATCH）与删除（DELETE）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { updateTask, deleteTask, type FollowUpStatus, type FollowUpTaskType } from "@/services/follow-up-service";

const VALID_STATUSES: FollowUpStatus[] = ["PENDING", "DONE", "CANCELLED"];
const VALID_TYPES: FollowUpTaskType[] = ["CUSTOMER_PROMISED", "ADVISOR_PROMISED", "AI_SUGGESTED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const patch: Parameters<typeof updateTask>[2] = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        throw new ApiError(400, "待办标题不能为空");
      }
      patch.title = body.title;
    }

    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== "string") {
        throw new ApiError(400, "描述格式不正确");
      }
      patch.description = body.description;
    }

    if (body.taskType !== undefined) {
      if (!VALID_TYPES.includes(body.taskType)) throw new ApiError(400, "无效的待办类型");
      patch.taskType = body.taskType;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate !== null && typeof body.dueDate !== "string") {
        throw new ApiError(400, "日期格式不正确");
      }
      patch.dueDate = body.dueDate;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) throw new ApiError(400, "无效的状态");
      patch.status = body.status;
    }

    const task = await updateTask(user.id, id, patch);
    return NextResponse.json({ ok: true, data: task });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const result = await deleteTask(user.id, id);
    return NextResponse.json({ ok: true, data: result });
  });
}
