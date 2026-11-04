"use client";

// 知识库页面客户端交互：新建按钮 + 弹窗 + 最近更新
import { useState, useEffect } from "react";
import { Plus, FileText, RefreshCw } from "lucide-react";
import { KnowledgeForm } from "./knowledge-form";

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  reviewStatus: string;
  updatedAt: string;
}

interface KnowledgeClientProps {
  initialCount: number;
}

export function KnowledgeClient({ initialCount }: KnowledgeClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [recent, setRecent] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadRecent() {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge?take=5");
      const json = await res.json();
      if (json.ok) setRecent(json.data.slice(0, 5));
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecent();
  }, []);

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
        <div className="space-y-2">
          {recent.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[12px] px-3 py-2.5"
              style={{ backgroundColor: "#FFFAFC" }}
            >
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
              >
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
              <span className="flex-1 truncate text-sm" style={{ color: "#302436" }}>
                {item.title}
              </span>
              <span className="text-xs shrink-0" style={{ color: "#94818D" }}>
                {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <FileText className="size-8 mb-2" style={{ color: "#F0C8DC" }} />
          <p className="text-sm" style={{ color: "#817786" }}>
            暂无知识条目
          </p>
          <p className="mt-1 text-xs" style={{ color: "#94818D" }}>
            点击右上角「新建知识」添加第一条
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
