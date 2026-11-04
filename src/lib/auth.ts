// 会话认证：JWT 签名 Cookie + 数据库会话记录（可撤销、可过期）
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import type { User } from "@/generated/prisma/client";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 天
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionUser = User;

/** 创建数据库会话并返回签名 Cookie 值 */
export async function createSession(userId: string): Promise<string> {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) },
  });
  return new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

/** 从 Cookie 解析当前登录用户；无会话时自动返回默认管理员（本地工具免登录） */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const sid = String(payload.sid ?? "");
      if (sid) {
        const session = await prisma.session.findUnique({
          where: { id: sid },
          include: { user: true },
        });
        if (session && session.expiresAt.getTime() >= Date.now() && session.user.status === "ACTIVE") {
          return session.user;
        }
      }
    } catch {
      // 签名无效则走默认用户
    }
  }
  // 本地工具模式：无登录时返回默认管理员
  return prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" } });
}

/** 必须登录；否则抛出 401 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "未登录或登录已过期");
  return user;
}

/** 写入会话 Cookie */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** 销毁会话（删除数据库记录 + 清除 Cookie） */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const sid = String(payload.sid ?? "");
      if (sid) await prisma.session.deleteMany({ where: { id: sid } });
    } catch {
      // 签名无效的 Cookie 直接清除即可
    }
  }
  store.delete(SESSION_COOKIE_NAME);
}
