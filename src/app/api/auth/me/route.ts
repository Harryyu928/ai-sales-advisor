// 当前登录用户信息
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });
}
