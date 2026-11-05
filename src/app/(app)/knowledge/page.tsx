// 知识库页面 V4.0：轻奢柔雾粉设计
import type { Metadata } from "next";
import { BookOpen, Search, FileText, CheckCircle, Clock, Database, GraduationCap, Globe, Target, BookMarked } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { KnowledgeClient } from "@/components/knowledge/knowledge-client";
import { KnowledgeSearch } from "@/components/knowledge/knowledge-search";
import { NewKnowledgeButton } from "@/components/knowledge/new-knowledge-button";

export const metadata: Metadata = { title: "知识库" };

const CATEGORIES = [
  { name: "雅思 IELTS", category: "IELTS", icon: GraduationCap, color: "var(--primary)", bg: "var(--primary-light)" },
  { name: "托福 TOEFL", category: "TOEFL", icon: BookOpen, color: "#5B8FD6", bg: "#E8F0FC" },
  { name: "PTE Academic", category: "PTE", icon: FileText, color: "#2D9B7E", bg: "#E5F5EF" },
  { name: "多邻国 DET", category: "DUOLINGO", icon: Globe, color: "#C47A20", bg: "#FDF3E3" },
  { name: "GRE / GMAT", category: "GRE_GMAT", icon: Target, color: "#8B5CF6", bg: "#F1EBFE" },
  { name: "SAT / ACT", category: "SAT_ACT", icon: BookMarked, color: "#E67E22", bg: "#FDEEE0" },
  { name: "国际升学", category: "ADMISSION", icon: GraduationCap, color: "var(--primary-deep)", bg: "var(--primary-light)" },
  { name: "销售策略", category: "SALES", icon: Database, color: "#795548", bg: "#EFEBE9" },
];

export default async function KnowledgePage() {
  await requireUser();
  const [total, approved, pending, categoryCounts] = await Promise.all([
    prisma.knowledgeDocument.count(),
    prisma.knowledgeDocument.count({ where: { reviewStatus: "APPROVED" } }),
    prisma.knowledgeDocument.count({ where: { reviewStatus: "PENDING_APPROVAL" } }),
    prisma.knowledgeDocument.groupBy({ by: ["category"], _count: true }),
  ]);

  const catMap: Record<string, number> = {};
  categoryCounts.forEach((c) => { catMap[c.category] = c._count; });

  const stats = [
    { label: "知识条目", value: total, desc: "已收录文档", icon: BookOpen, color: "var(--primary)", bg: "var(--primary-light)" },
    { label: "已审核", value: approved, desc: "可供 AI 检索引用", icon: CheckCircle, color: "#2D9B7E", bg: "#E5F5EF" },
    { label: "待审核", value: pending, desc: "等待核实和发布", icon: Clock, color: "#C47A20", bg: "#FDF3E3" },
    { label: "考试分类", value: Object.keys(catMap).length, desc: "覆盖的考试与主题", icon: Database, color: "#8B5CF6", bg: "#F1EBFE" },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "var(--primary-light)" }}
        >
          <BookOpen className="size-5" style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "var(--foreground)" }}>
            知识库
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
            构建国际教育与语言培训的专业知识体系，为 AI 回复提供可靠、最新的参考
          </p>
        </div>
      </div>

      {/* 顶部视觉横幅 */}
      <div
        className="relative overflow-hidden rounded-[20px] p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, var(--primary-light) 0%, var(--primary-soft) 60%, #FFFAFC 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="relative z-10">
          <h2 className="text-lg font-semibold md:text-xl" style={{ color: "var(--primary-deep)" }}>
            专业知识 · 精准回复
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["考试政策", "升学要求", "备考规划", "销售策略"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: "#FFFFFF", color: "var(--primary-deep)", border: "1px solid var(--gold)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        {/* 装饰元素 */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block">
          <div className="flex items-center gap-4 opacity-60">
            <BookOpen className="size-10" style={{ color: "var(--primary)" }} />
            <GraduationCap className="size-12" style={{ color: "var(--primary-deep)" }} />
            <Globe className="size-9" style={{ color: "var(--primary)" }} />
          </div>
        </div>
      </div>

      {/* 搜索区 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <KnowledgeSearch />
        <NewKnowledgeButton />
      </div>

      {/* 数据概览 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-lift rounded-[18px] bg-white p-5"
            style={{ border: "1px solid var(--border)" }}
          >
            <div
              className="flex size-10 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: s.bg }}
            >
              <s.icon className="size-5" style={{ color: s.color }} />
            </div>
            <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {s.value}
            </div>
            <div className="mt-1 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {s.label}
            </div>
            <div className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>

      {/* 分类网格 */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            考试与主题分类
          </h3>
          <button className="text-xs" style={{ color: "var(--primary)" }}>
            全部分类
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className="card-lift flex items-center gap-3 rounded-[16px] bg-white p-4 text-left"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: cat.bg }}
              >
                <cat.icon className="size-5" style={{ color: cat.color }} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {cat.name}
                </div>
                <div className="text-xs" style={{ color: "#94818D" }}>
                  {(catMap[cat.category] ?? 0)} 条知识
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 底部：最近更新 + 维护提醒 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 最近更新 */}
        <div
          className="rounded-[18px] bg-white p-5"
          style={{ border: "1px solid var(--border)" }}
        >
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            最近更新
          </h4>
          <KnowledgeClient initialCount={total} />
        </div>

        {/* 维护提醒 */}
        <div
          className="rounded-[18px] p-5"
          style={{ background: "linear-gradient(135deg, var(--primary-light) 0%, var(--primary-soft) 100%)", border: "1px solid var(--gold)" }}
        >
          <h4 className="text-sm font-semibold" style={{ color: "var(--primary-deep)" }}>
            知识维护提醒
          </h4>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full bg-white"
            >
              <Clock className="size-5" style={{ color: pending > 0 ? "#C47A20" : "#2D9B7E" }} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {pending > 0 ? `${pending} 条知识待审核` : "当前没有需要复核的知识"}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {pending > 0 ? "新录入的知识需要审核后才能被 AI 引用" : "所有知识都已审核通过"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
