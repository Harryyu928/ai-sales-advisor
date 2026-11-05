// 已登录区域布局：服务端校验会话，注入个人身份与主题偏好
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // 导航徽标：今日到期 + 已逾期的待办数量
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const [followUpCount, identity, theme] = await Promise.all([
    prisma.followUpTask.count({
      where: {
        userId: user.id,
        status: "PENDING",
        dueDate: { not: null, lte: endOfToday },
      },
    }),
    prisma.personalIdentity.findUnique({ where: { userId: user.id } }),
    prisma.userThemePreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: identity?.title || "教育顾问",
      }}
      identity={{
        nickname: identity?.nickname || null,
        englishName: identity?.englishName || null,
        monogram: identity?.monogram || null,
        title: identity?.title || null,
        welcomeMessage: identity?.welcomeMessage || null,
        avatarMode: identity?.avatarMode || "MONOGRAM",
      }}
      theme={{
        theme: theme?.theme || "rose-champagne",
        density: theme?.density || "comfortable",
        radius: theme?.radius || "soft",
        motion: theme?.motion || "gentle",
        welcomeArea: theme?.welcomeArea !== false,
        background: theme?.background || "rose-desk",
      }}
      followUpCount={followUpCount}
    >
      {children}
    </AppShell>
  );
}
