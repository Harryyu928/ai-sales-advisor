// 我的风格 V6.1：AI 表达档案（基于真实学习样本，不虚构进度）
import type { Metadata } from "next";
import { Sparkles, MessageSquare, History, BookOpen, Upload, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Monogram } from "@/components/layout/monogram";

export const metadata: Metadata = { title: "我的表达档案" };

export default async function StylePage() {
  const user = await requireUser();
  const [activeExamples, versions, latestVersion, identity] = await Promise.all([
    prisma.styleExample.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.styleProfileVersion.count({ where: { userId: user.id } }),
    prisma.styleProfileVersion.findFirst({
      where: { userId: user.id },
      orderBy: { version: "desc" },
    }),
    prisma.personalIdentity.findUnique({ where: { userId: user.id } }),
  ]);

  const nickname = identity?.nickname || user.name;
  const hasProfile = !!latestVersion && activeExamples > 0;
  const styleName = hasProfile ? `个人风格 v${latestVersion?.version}` : "默认专业风格";
  const profile = (latestVersion?.profile as Record<string, unknown> | null) ?? null;

  const stats = [
    { label: "学习样本", value: activeExamples, icon: MessageSquare },
    { label: "画像版本", value: versions, icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* 表达身份卡 */}
      <section
        className="flex items-center gap-4 rounded-[20px] p-5 md:p-6"
        style={{
          background: "linear-gradient(135deg, var(--primary-light) 0%, var(--primary-soft) 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <Monogram name={user.name} custom={identity?.monogram} size="xl" />
        <div>
          <h1 className="text-xl font-semibold md:text-2xl" style={{ color: "var(--primary-deep)", fontFamily: "var(--font-serif)" }}>
            {nickname} 的表达档案
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            当前风格：{styleName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["自然亲切", "专业清晰", "温和引导"].map((tag) => (
              <span key={tag} className="rounded-full px-3 py-1 text-xs"
                style={{ backgroundColor: "var(--card)", color: "var(--primary-deep)", border: "1px solid var(--border)" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 真实统计 */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card-lift rounded-[18px] p-5"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex size-10 items-center justify-center rounded-[12px]" style={{ backgroundColor: "var(--primary-light)" }}>
              <s.icon className="size-5" style={{ color: "var(--primary-deep)" }} />
            </div>
            <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}>
              {s.value}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 语言指纹 */}
      <section className="card-lift rounded-[20px] p-5 md:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="mb-4 text-base font-semibold" style={{ color: "var(--foreground)" }}>
          语言指纹
        </h3>
        {hasProfile && profile ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(profile).map(([k, v]) => (
              <div key={k} className="rounded-[12px] p-3" style={{ backgroundColor: "var(--primary-soft)" }}>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{k}</div>
                <div className="mt-1 text-sm" style={{ color: "var(--foreground)" }}>
                  {typeof v === "string" ? v : JSON.stringify(v)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center"
            style={{ backgroundColor: "var(--primary-soft)", borderRadius: "14px" }}>
            <BookOpen className="size-8" style={{ color: "var(--input)" }} />
            <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              还没有学习样本，当前使用默认专业风格
            </div>
            <div className="max-w-md text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              当你生成并确认回复、或导入历史聊天后，系统会真实分析你的称呼、口头语、句式、回复长度与提问习惯，
              形成可查看的个人语言指纹。在此之前不会假装已经学会你的风格。
            </div>
          </div>
        )}
      </section>

      {/* 学习来源 */}
      <section className="card-lift rounded-[20px] p-5 md:p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="mb-4 text-base font-semibold" style={{ color: "var(--foreground)" }}>
          风格如何被学习
        </h3>
        <div className="space-y-3">
          {[
            { icon: Upload, text: "导入历史微信聊天截图" },
            { icon: MessageSquare, text: "你修改后的 AI 回复会被参考" },
            { icon: CheckCircle2, text: "你确认实际发送的最终版本" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: "var(--primary-light)" }}>
                <item.icon className="size-3.5" style={{ color: "var(--primary-deep)" }} />
              </div>
              <span className="text-sm" style={{ color: "var(--foreground)" }}>{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
