// 修改密码：校验当前密码 → 更新哈希 → 吊销全部会话
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";
import { handle, ok, fail, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({
  oldPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(8, "新密码至少 8 位").max(72, "新密码过长"),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(400, "参数不正确");

    const { oldPassword, newPassword } = parsed.data;
    const okPass = await verifyPassword(oldPassword, user.passwordHash);
    if (!okPass) throw new ApiError(400, "当前密码不正确");

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    // 吊销该账号所有会话（包括当前），强制重新登录
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await audit(user.id, "CHANGE_PASSWORD");

    return ok({ changed: true });
  });
}
