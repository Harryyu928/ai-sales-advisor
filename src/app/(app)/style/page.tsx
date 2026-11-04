// 我的风格页面 V4.0：轻奢柔雾粉设计
import type { Metadata } from "next";
import { Sparkles, Upload, BookOpen, MessageSquare, PenLine, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "我的风格" };

export default async function StylePage() {
  const user = await requireUser();
  const [examples, versions] = await Promise.all([
    prisma.styleExample.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.styleProfileVersion.count({ where: { userId: user.id } }),
  ]);

  const stats = [
    { label: "学习样本", value: examples, icon: MessageSquare, color: "#E65B93", bg: "#FCE7F0" },
    { label: "画像版本", value: versions, icon: Sparkles, color: "#8B5CF6", bg: "#F1EBFE" },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
        >
          <Sparkles className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "#302436" }}>
            我的表达风格
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
            让 AI 逐渐熟悉你的表达习惯，生成像你本人写的回复
          </p>
        </div>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-lift rounded-[18px] bg-white p-5"
            style={{ border: "1px solid #F5E0EC" }}
          >
            <div
              className="flex size-10 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: s.bg }}
            >
              <s.icon className="size-5" style={{ color: s.color }} />
            </div>
            <div className="mt-3 text-2xl font-semibold" style={{ color: "#302436" }}>
              {s.value}
            </div>
            <div className="mt-1 text-xs" style={{ color: "#817786" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* 风格画像说明 */}
      <div
        className="card-lift rounded-[20px] bg-white p-5 md:p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: "#302436" }}>
          风格画像
        </h3>
        {examples === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-10 text-center"
            style={{ backgroundColor: "#FFF1F6", borderRadius: "14px" }}
          >
            <BookOpen className="size-8" style={{ color: "#F0C8DC" }} />
            <div className="text-sm font-medium" style={{ color: "#302436" }}>
              还没有学习样本
            </div>
            <div className="max-w-md text-xs leading-relaxed" style={{ color: "#817786" }}>
              导入历史微信聊天截图，系统会分析您的称呼、口头语、句式、回复长度、提问习惯等特征，
              生成可查看、可编辑的个人风格画像
            </div>
            <button
              className="mt-2 flex h-10 items-center gap-2 rounded-[12px] px-5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
            >
              <Upload className="size-4" />
              导入历史聊天
            </button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "#543C49" }}>
            当前画像版本 v{versions}（已学习 {examples} 条样本）
          </p>
        )}
      </div>

      {/* 学习来源 */}
      <div
        className="card-lift rounded-[20px] bg-white p-5 md:p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: "#302436" }}>
          学习来源
        </h3>
        <div className="space-y-3">
          {[
            { icon: MessageSquare, text: "批量导入的历史微信聊天截图" },
            { icon: PenLine, text: "您修改后的 AI 回复" },
            { icon: Clock, text: "您确认实际发送的最终版本" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="flex size-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "#FCE7F0" }}
              >
                <item.icon className="size-3.5" style={{ color: "#E65B93" }} />
              </div>
              <span className="text-sm" style={{ color: "#543C49" }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
