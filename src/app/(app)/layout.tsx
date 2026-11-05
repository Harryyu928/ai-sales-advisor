// 已登录区域布局：服务端校验会话，无效则跳转登录
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
  const followUpCount = await prisma.followUpTask.count({
    where: {
      userId: user.id,
      status: "PENDING",
      dueDate: { not: null, lte: endOfToday },
    },
  });

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: "教育顾问",
      }}
      followUpCount={followUpCount}
    >
      {children}
    </AppShell>
  );
}
