"use client";

// 新建知识表单弹窗
import { useState } from "react";
import { X, Plus } from "lucide-react";

interface KnowledgeFormProps {
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { value: "IELTS", label: "雅思 IELTS" },
  { value: "TOEFL", label: "托福 TOEFL" },
  { value: "PTE", label: "PTE Academic" },
  { value: "DUOLINGO", label: "多邻国 DET" },
  { value: "GRE_GMAT", label: "GRE / GMAT" },
  { value: "SAT_ACT", label: "SAT / ACT" },
  { value: "ADMISSION", label: "国际升学" },
  { value: "SALES", label: "销售策略" },
  { value: "COURSE", label: "课程产品" },
];

export function KnowledgeForm({ onClose, onSaved }: KnowledgeFormProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("IELTS");
  const [content, setContent] = useState("");
  const [examType, setExamType] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !content.trim()) {
      setError("标题和内容不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          content: content.trim(),
          examType: examType.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "保存失败");
        return;
      }
      onSaved();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(48, 36, 54, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[20px] bg-white p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: "#302436" }}>
            新建知识
          </h3>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full"
            style={{ color: "#94818D" }}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "#817786" }}>
              知识标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：2026年雅思考试报名时间"
              className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
              style={{ backgroundColor: "#FFFAFC", border: "1px solid #F0C8DC", color: "#302436" }}
            />
          </div>

          {/* 分类 + 考试 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#817786" }}>
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                style={{ backgroundColor: "#FFFAFC", border: "1px solid #F0C8DC", color: "#302436" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#817786" }}>
                考试/主题（选填）
              </label>
              <input
                type="text"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                placeholder="例如：雅思"
                className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                style={{ backgroundColor: "#FFFAFC", border: "1px solid #F0C8DC", color: "#302436" }}
              />
            </div>
          </div>

          {/* 内容 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "#817786" }}>
              知识内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="输入知识的详细内容，AI 回复时会参考这些内容……"
              className="w-full rounded-[12px] p-4 text-sm leading-relaxed outline-none"
              style={{ backgroundColor: "#FFFAFC", border: "1px solid #F0C8DC", color: "#302436", resize: "vertical" }}
            />
          </div>

          {/* 官方来源 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "#817786" }}>
              官方来源链接（选填）
            </label>
            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="例如：https://www.ielts.org"
              className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
              style={{ backgroundColor: "#FFFAFC", border: "1px solid #F0C8DC", color: "#302436" }}
            />
            <p className="mt-1.5 text-xs" style={{ color: "#94818D" }}>
              考试资讯类知识请填写官方网站链接，不引用第三方来源
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#D94052" }}>
              {error}
            </p>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-[12px] py-3 text-sm font-medium"
              style={{ backgroundColor: "#FFF1F6", color: "#817786" }}
            >
              取消
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-[12px] py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
            >
              {saving ? "保存中…" : (<><Plus className="size-4" /> 保存知识</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
