"use client";

// 知识库页面客户端交互：新建按钮 + 弹窗 + 最近更新（含完整来源信息）
import { useState, useEffect } from "react";
import { Plus, FileText, RefreshCw, ExternalLink, ShieldCheck, CalendarClock } from "lucide-react";
import { KnowledgeForm } from "./knowledge-form";

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  examType: string | null;
  reviewStatus: string;
  sourceType: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  effectiveDate: string | null;
  updatedAt: string;
}

interface KnowledgeClientProps {
  initialCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  IELTS: "雅思",
  TOEFL: "托福",
  PTE: "PTE",
  DUOLINGO: "多邻国",
  GRE_GMAT: "GRE/GMAT",
  SAT_ACT: "SAT/ACT",
  ADMISSION: "升学",
  SALES: "销售",
  COURSE: "课程",
};

const SOURCE_LABELS: Record<string, string> = {
  official: "官方来源",
  manual: "内部整理",
  upload: "上传资料",
  internal: "内部文档",
};

export function KnowledgeClient({ initialCount }: KnowledgeClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [recent, setRecent] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadRecent() {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge?take=10");
      const json = await res.json();
      if (json.ok) setRecent(json.data.slice(0, 10));
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

  return (
    <>
      {/* 新建按钮 */}
      <button
        onClick={() => setShowForm(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
      >
        <Plus className="size-4" />
        新建知识
      </button>

      {/* 最近更新列表 */}
      {loading && recent.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="size-4 animate-spin" style={{ color: "#E65B93" }} />
        </div>
      ) : recent.length > 0 ? (
        <div className="space-y-2.5">
          {recent.map((item) => {
            const expired = item.effectiveDate
              ? new Date(item.effectiveDate) < new Date()
              : false;
            return (
              <div
                key={item.id}
                className="rounded-[14px] px-4 py-3"
                style={{ backgroundColor: "#FFFAFC", border: "1px solid #F5E0EC" }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0"
                    style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
                  >
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium" style={{ color: "#302436" }}>
                    {item.title}
                  </span>
                  {expired && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] shrink-0"
                      style={{ backgroundColor: "#FDECEC", color: "#D94052" }}>
                      可能过期
                    </span>
                  )}
                </div>

                {/* 来源信息行 */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[10px]" style={{ color: "#817786" }}>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3" style={{ color: "#E65B93" }} />
                    {SOURCE_LABELS[item.sourceType || "manual"] || "内部整理"}
                  </span>
                  {item.verifiedAt && (
                    <span>核实：{item.verifiedAt.slice(0, 10)}</span>
                  )}
                  {item.effectiveDate && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      生效：{item.effectiveDate.slice(0, 10)}
                    </span>
                  )}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5"
                      style={{ color: "#C82E72" }}
                    >
                      查看来源 <ExternalLink className="size-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <FileText className="size-8 mb-2" style={{ color: "#F0C8DC" }} />
          <p className="text-sm" style={{ color: "#817786" }}>
            暂无知识条目
          </p>
          <p className="mt-1 text-xs" style={{ color: "#94818D" }}>
            点击「新建知识」添加第一条
          </p>
        </div>
      )}

      {/* 新建弹窗 */}
      {showForm && (
        <KnowledgeForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadRecent();
          }}
        />
      )}
    </>
  );
}
