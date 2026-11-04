"use client";

// 应用外壳 V4.0：轻奢柔雾粉侧边栏 + 手机底部导航
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquareText,
  Users,
  Sparkles,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "AI 回复", icon: MessageSquareText },
  { href: "/customers", label: "客户记录", icon: Users },
  { href: "/style", label: "我的风格", icon: Sparkles },
  { href: "/knowledge", label: "知识库", icon: BookOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

interface AppShellProps {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "#FFFAFC" }}>
      {/* 桌面端侧边导航 */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col md:flex"
        style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid #F5E0EC" }}
      >
        {/* 品牌区 */}
        <div className="flex h-18 items-center gap-3 px-6 py-5">
          <div
            className="flex size-10 items-center justify-center rounded-[12px] shadow-sm"
            style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
          >
            <Sparkles className="size-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold" style={{ color: "#302436" }}>
              Advisor AI
            </div>
            <div className="text-[11px]" style={{ color: "#817786" }}>
              销售智能助手
            </div>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 space-y-1 px-4 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-sm transition-all duration-200"
                )}
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, #FCE7F0 0%, #FFF1F6 100%)",
                        color: "#C82E72",
                        fontWeight: 500,
                      }
                    : { color: "#817786" }
                }
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部波浪装饰 + 用户区 */}
        <div className="relative">
          {/* 浅粉波浪装饰 */}
          <svg
            viewBox="0 0 248 40"
            className="w-full opacity-40"
            preserveAspectRatio="none"
            style={{ height: "32px" }}
          >
            <path
              d="M0,20 Q62,0 124,20 T248,20 L248,40 L0,40 Z"
              fill="#FCE7F0"
            />
          </svg>
          <div className="px-5 pb-5 pt-2">
            <div className="flex items-center gap-3">
              <div
                className="flex size-9 items-center justify-center rounded-full text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #FCE7F0 0%, #FFF1F6 100%)", color: "#E65B93" }}
              >
                {user.name.slice(0, 1)}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium" style={{ color: "#302436" }}>
                  {user.name}
                </div>
                <div className="truncate text-[11px]" style={{ color: "#94818D" }}>
                  教育顾问
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-opacity hover:opacity-60"
              style={{ color: "#94818D" }}
            >
              <LogOut className="size-3.5" />
              退出
            </button>
          </div>
        </div>
      </aside>

      {/* 手机端顶栏 */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:hidden"
        style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #F5E0EC" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-[8px]"
            style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
          >
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#302436" }}>
            Advisor AI
          </span>
        </div>
        <button
          onClick={handleLogout}
          aria-label="退出"
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ color: "#94818D" }}
        >
          <LogOut className="size-5" />
        </button>
      </header>

      {/* 主内容区 */}
      <main
        className="pb-24 md:pb-10 md:pl-[248px]"
        style={{ background: "linear-gradient(180deg, #FFF1F6 0%, #FFFAFC 400px)" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      {/* 手机端底部固定导航 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t md:hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#F5E0EC",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px]"
                style={{
                  color: active ? "#E65B93" : "#94818D",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
