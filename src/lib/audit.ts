// 审计日志（不记录个人信息，仅记录动作与对象）
import { prisma } from "@/lib/db";

export async function audit(
  userId: string | null,
  action: string,
  opts: { entityType?: string; entityId?: string; detail?: unknown; ip?: string } = {}
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        detail: opts.detail as never,
        ip: opts.ip,
      },
    });
  } catch (e) {
    // 审计失败不应阻断主流程
    console.error("[audit] 写入失败:", e);
  }
}
