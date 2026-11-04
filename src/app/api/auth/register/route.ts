// 注册账号（首版开放注册；生产环境可关闭，见 README）
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { handle, ok, fail, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确").max(255),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码过长"),
  name: z.string().min(1, "请输入姓名").max(50, "姓名过长"),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, "参数不正确", parsed.error.flatten());
    }
    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new ApiError(409, "该邮箱已注册");

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        name,
        role: "ADVISOR",
      },
    });
    // 每位顾问默认建立个人资料
    await prisma.advisorProfile.create({ data: { userId: user.id } });

    await audit(user.id, "REGISTER", { ip: req.headers.get("x-forwarded-for") ?? undefined });

    return ok(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      201
    );
  });
}
