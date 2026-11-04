// 设置页面 V4.0：轻奢柔雾粉设计
import type { Metadata } from "next";
import { Settings, User, ShieldCheck, KeyRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aiConfigured, env } from "@/lib/env";
import { storageRoot } from "@/lib/storage";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const metadata: Metadata = { title: "设置" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "#FCE7F0" }}
        >
          <Settings className="size-5" style={{ color: "#E65B93" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "#302436" }}>
            设置
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
            账号信息与系统配置
          </p>
        </div>
      </div>

      {/* 账号信息 */}
      <div
        className="card-lift rounded-[20px] bg-white p-5 md:p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex size-8 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "#FCE7F0" }}
          >
            <User className="size-4" style={{ color: "#E65B93" }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "#302436" }}>
            账号信息
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: "#817786" }}>姓名</span>
            <span className="font-medium" style={{ color: "#302436" }}>{user.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#817786" }}>邮箱</span>
            <span className="font-medium" style={{ color: "#302436" }}>{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#817786" }}>角色</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
            >
              教育顾问
            </span>
          </div>
        </div>
      </div>

      {/* 系统状态 */}
      <div
        className="card-lift rounded-[20px] bg-white p-5 md:p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex size-8 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "#FCE7F0" }}
          >
            <ShieldCheck className="size-4" style={{ color: "#E65B93" }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "#302436" }}>
            系统状态
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#817786" }}>AI 模型接口</span>
            {aiConfigured ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "#E5F5EF", color: "#2D9B7E" }}
              >
                已配置
              </span>
            ) : (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ backgroundColor: "#FDF3E3", color: "#C47A20" }}
              >
                未配置
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#817786" }}>截图存储位置</span>
            <span className="max-w-[55%] truncate text-xs" style={{ color: "#543C49" }}>
              {storageRoot()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#817786" }}>数据库</span>
            <span className="text-xs" style={{ color: "#543C49" }}>
              PostgreSQL · {env.DATABASE_URL.split("@").pop()?.split("?")[0]}
            </span>
          </div>
        </div>
      </div>

      {/* 修改密码 */}
      <div
        className="card-lift rounded-[20px] bg-white p-5 md:p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex size-8 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "#FCE7F0" }}
          >
            <KeyRound className="size-4" style={{ color: "#E65B93" }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "#302436" }}>
            修改密码
          </h3>
        </div>
        <p className="text-xs mb-4" style={{ color: "#817786" }}>
          修改后将需要重新登录
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
