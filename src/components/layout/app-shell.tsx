"use client";

// 应用外壳 V4.0：轻奢柔雾粉侧边栏 + 手机底部导航
// V2.1：桌面端分组导航（9 项）；手机端 4 个常用入口 + 更多菜单
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquareText,
  Users,
  Sparkles,
  BookOpen,
  Settings,
  LogOut,
  BellRing,
  FolderOpen,
  GraduationCap,
  BarChart3,
  LayoutGrid,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "followup";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "工作台",
    items: [
      { href: "/", label: "AI 回复", icon: MessageSquareText },
      { href: "/follow-ups", label: "跟进提醒", icon: BellRing, badge: "followup" },
    ],
  },
  {
    title: "客户与资料",
    items: [
      { href: "/customers", label: "客户记录", icon: Users },
      { href: "/materials", label: "销售资料", icon: FolderOpen },
      { href: "/knowledge", label: "知识库", icon: BookOpen },
    ],
  },
  {
    title: "成长与分析",
    items: [
      { href: "/style", label: "我的风格", icon: Sparkles },
      { href: "/study-plans", label: "备考路径", icon: GraduationCap },
      { href: "/effect-analysis", label: "效果分析", icon: BarChart3 },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { href: "/settings", label: "设置", icon: Settings };

const ALL_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

// 手机底部固定 4 个常用入口，第 5 个为"更多"
const MOBILE_PRIMARY: NavItem[] = [
  { href: "/", label: "AI 回复", icon: MessageSquareText },
  { href: "/follow-ups", label: "跟进", icon: BellRing, badge: "followup" },
  { href: "/customers", label: "客户", icon: Users },
  { href: "/materials", label: "资料", icon: FolderOpen },
];

interface AppShellProps {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
  followUpCount?: number;
}

export function AppShell({ user, children, followUpCount = 0 }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/");
    router.refresh();
  }

  function renderNavLink(item: NavItem, active: boolean) {
    return (
      <>
        <item.icon className="size-[18px]" />
        <span className="flex-1">{item.label}</span>
        {item.badge === "followup" && followUpCount > 0 && (
          <span
            className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
            style={{ backgroundColor: "#E65B93", color: "#FFFFFF" }}
          >
            {followUpCount > 99 ? "99+" : followUpCount}
          </span>
        )}
      </>
    );
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

        {/* 分组导航 */}
        <nav className="flex-1 overflow-y-auto px-4 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-2">
              <div
                className="px-3.5 pb-1 pt-2 text-[10px] font-semibold tracking-wider"
                style={{ color: "#B4A8B8" }}
              >
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-sm transition-all duration-200"
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
                      {renderNavLink(item, active)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 设置 */}
          <div className="space-y-1">
            <Link
              href={SETTINGS_ITEM.href}
              className="flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-sm transition-all duration-200"
              style={
                pathname === SETTINGS_ITEM.href
                  ? {
                      background: "linear-gradient(135deg, #FCE7F0 0%, #FFF1F6 100%)",
                      color: "#C82E72",
                      fontWeight: 500,
                    }
                  : { color: "#817786" }
              }
            >
              {renderNavLink(SETTINGS_ITEM, pathname === SETTINGS_ITEM.href)}
            </Link>
          </div>
        </nav>

        {/* 底部波浪装饰 + 用户区 */}
        <div className="relative">
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

      {/* 手机端底部固定导航：4 常用 + 更多 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t md:hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#F5E0EC",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="grid grid-cols-5">
          {MOBILE_PRIMARY.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-1 py-2.5 text-[11px]"
                style={{
                  color: active ? "#E65B93" : "#94818D",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <item.icon className="size-5" />
                {item.label}
                {item.badge === "followup" && followUpCount > 0 && (
                  <span
                    className="absolute right-2.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                    style={{ backgroundColor: "#E65B93", color: "#FFFFFF" }}
                  >
                    {followUpCount > 99 ? "99+" : followUpCount}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px]"
            style={{ color: "#94818D" }}
          >
            <LayoutGrid className="size-5" />
            更多
          </button>
        </div>
      </nav>

      {/* 手机端更多菜单（底部滑入面板） */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[24px] px-5 pb-8 pt-4"
            style={{
              backgroundColor: "#FFFAFC",
              paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "#E8DCE4" }} />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "#302436" }}>
                全部功能
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="关闭"
                className="flex size-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ALL_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-[16px] px-2 py-4"
                    style={{
                      backgroundColor: active ? "#FCE7F0" : "#FFFFFF",
                      border: "1px solid #F5E0EC",
                      color: active ? "#C82E72" : "#543C49",
                    }}
                  >
                    <item.icon className="size-5" />
                    <span className="text-[11px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
