// 登录：校验密码 → 创建会话 → 写入 HttpOnly Cookie
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/auth";
import { handle, ok, fail, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail(400, "参数不正确");

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new ApiError(401, "邮箱或密码错误");

    if (user.status !== "ACTIVE") throw new ApiError(403, "账号已被停用");

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) throw new ApiError(401, "邮箱或密码错误");

    const token = await createSession(user.id);
    await setSessionCookie(token);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit(user.id, "LOGIN", { ip: req.headers.get("x-forwarded-for") ?? undefined });

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  });
}
