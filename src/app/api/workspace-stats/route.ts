// /api/workspace-stats —— 工作台快捷模块的真实计数（按用户隔离）
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [dueCount, savedReplies, materials, studyPlans, conversations] = await Promise.all([
      prisma.followUpTask.count({
        where: { userId: user.id, status: "PENDING", dueDate: { not: null, lte: endOfToday } },
      }),
      prisma.savedReply.count({ where: { userId: user.id } }),
      prisma.salesMaterial.count({ where: { userId: user.id } }),
      prisma.studyPlan.count({ where: { userId: user.id } }),
      prisma.conversation.count({ where: { userId: user.id } }),
    ]);

    return ok({
      dueCount,
      savedReplies,
      materials,
      studyPlans,
      conversations,
    });
  });
}
