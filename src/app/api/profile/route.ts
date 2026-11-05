// /api/profile —— 个人数字身份 + 主题/工作台偏好（GET 读取，PUT 更新）
// V6.1 私人 AI 顾问工作室：所有配置按 userId 隔离，upsert 持久化
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

const VALID_THEMES = ["rose-champagne", "twilight-berry", "moonlight-rose", "peach-velvet"];
const VALID_DENSITY = ["compact", "comfortable", "spacious"];
const VALID_RADIUS = ["sharp", "soft", "round"];
const VALID_MOTION = ["none", "gentle"];
const VALID_AVATAR = ["MONOGRAM", "INITIAL", "SIGNATURE"];
const IDENTITY_FIELDS = ["nickname", "englishName", "monogram", "title", "bio", "welcomeMessage", "signature"];

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const [identity, theme] = await Promise.all([
      prisma.personalIdentity.findUnique({ where: { userId: user.id } }),
      prisma.userThemePreference.findUnique({ where: { userId: user.id } }),
    ]);

    return ok({
      user: { name: user.name, email: user.email },
      identity: identity ?? null,
      theme: theme ?? null,
    });
  });
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json().catch(() => ({}));
    const { identity, theme } = body ?? {};

    let updatedIdentity = null;
    if (identity && typeof identity === "object") {
      const data: Record<string, unknown> = {};
      for (const k of IDENTITY_FIELDS) {
        const v = (identity as Record<string, unknown>)[k];
        if (typeof v === "string") data[k] = v;
      }
      if (
        typeof identity.avatarMode === "string" &&
        VALID_AVATAR.includes(identity.avatarMode)
      ) {
        data.avatarMode = identity.avatarMode;
      }
      updatedIdentity = await prisma.personalIdentity.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...data },
        update: data,
      });
    }

    let updatedTheme = null;
    if (theme && typeof theme === "object") {
      const data: Record<string, unknown> = {};
      if (typeof theme.theme === "string" && VALID_THEMES.includes(theme.theme))
        data.theme = theme.theme;
      if (typeof theme.density === "string" && VALID_DENSITY.includes(theme.density))
        data.density = theme.density;
      if (typeof theme.radius === "string" && VALID_RADIUS.includes(theme.radius))
        data.radius = theme.radius;
      if (typeof theme.motion === "string" && VALID_MOTION.includes(theme.motion))
        data.motion = theme.motion;
      if (typeof theme.welcomeArea === "boolean") data.welcomeArea = theme.welcomeArea;
      if (typeof theme.background === "string") data.background = theme.background;
      if (theme.workspaceModules && typeof theme.workspaceModules === "object")
        data.workspaceModules = theme.workspaceModules;
      updatedTheme = await prisma.userThemePreference.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...data },
        update: data,
      });
    }

    return ok({ identity: updatedIdentity, theme: updatedTheme });
  });
}
