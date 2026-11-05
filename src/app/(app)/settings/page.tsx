// 设置页面 V6.1：个人定制中心 + 账号信息与系统配置
import type { Metadata } from "next";
import { Settings, User, ShieldCheck, KeyRound, Gem } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aiConfigured, env } from "@/lib/env";
import { storageRoot } from "@/lib/storage";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { PersonalizePanel } from "@/components/settings/personalize-panel";

export const metadata: Metadata = { title: "设置" };

export default async function SettingsPage() {
  const user = await requireUser();

  const iconBox = { backgroundColor: "var(--primary-light)" };
  const iconColor = { color: "var(--primary)" };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-[12px]" style={iconBox}>
          <Settings className="size-5" style={iconColor} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "var(--foreground)" }}>
            个人设置
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
            你的数字身份、视觉主题与账号配置
          </p>
        </div>
      </div>

      {/* 个人定制中心 */}
      <div
        className="card-lift rounded-[20px] p-5 md:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex size-8 items-center justify-center rounded-[10px]" style={iconBox}>
            <Gem className="size-4" style={iconColor} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              私人定制工作室
            </h3>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Your Expertise. Your Style. Your AI.
            </p>
          </div>
        </div>
        <PersonalizePanel defaultName={user.name} />
      </div>

      {/* 账号信息 */}
      <div
        className="card-lift rounded-[20px] p-5 md:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex size-8 items-center justify-center rounded-[10px]" style={iconBox}>
            <User className="size-4" style={iconColor} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>账号信息</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--muted-foreground)" }}>姓名</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>{user.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--muted-foreground)" }}>邮箱</span>
            <span className="font-medium" style={{ color: "var(--foreground)" }}>{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--muted-foreground)" }}>角色</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-deep)" }}
            >
              教育顾问
            </span>
          </div>
        </div>
      </div>

      {/* 系统状态 */}
      <div
        className="card-lift rounded-[20px] p-5 md:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex size-8 items-center justify-center rounded-[10px]" style={iconBox}>
            <ShieldCheck className="size-4" style={iconColor} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>系统状态</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--muted-foreground)" }}>AI 模型接口</span>
            {aiConfigured ? (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "#E5F5EF", color: "#2D9B7E" }}>已配置</span>
            ) : (
              <span className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ backgroundColor: "#FDF3E3", color: "#C47A20" }}>未配置</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--muted-foreground)" }}>截图存储位置</span>
            <span className="max-w-[55%] truncate text-xs" style={{ color: "var(--foreground)" }}>{storageRoot()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--muted-foreground)" }}>数据库</span>
            <span className="text-xs" style={{ color: "var(--foreground)" }}>
              PostgreSQL · {env.DATABASE_URL.split("@").pop()?.split("?")[0]}
            </span>
          </div>
        </div>
      </div>

      {/* 修改密码 */}
      <div
        className="card-lift rounded-[20px] p-5 md:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex size-8 items-center justify-center rounded-[10px]" style={iconBox}>
            <KeyRound className="size-4" style={iconColor} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>修改密码</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>修改后将需要重新登录</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
