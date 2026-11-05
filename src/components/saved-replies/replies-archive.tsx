"use client";

// 话术资产馆客户端：搜索 + 分类筛选 + 卡片 + 一键复制
import { useMemo, useState } from "react";
import { Search, Copy, Check, Star, FolderOpen } from "lucide-react";

interface ReplyItem {
  id: string;
  content: string;
  customerContext: string | null;
  stage: string | null;
  customerConcern: string | null;
  questionType: string | null;
  status: string;
  favorite: boolean;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  COLLECTED: "已收藏",
  SENT: "已发送",
  EFFECTIVE: "效果好",
};

export function RepliesArchive({ initial }: { initial: ReplyItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(["全部"]);
    initial.forEach((r) => {
      if (r.stage) set.add(r.stage);
    });
    return Array.from(set);
  }, [initial]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((r) => {
      if (category !== "全部" && r.stage !== category) return false;
      if (!q) return true;
      return (
        r.content.toLowerCase().includes(q) ||
        (r.customerContext || "").toLowerCase().includes(q) ||
        (r.customerConcern || "").toLowerCase().includes(q)
      );
    });
  }, [initial, query, category]);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
    } catch {}
  }

  return (
    <div className="space-y-4">
      {/* 搜索 + 分类 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-2.5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", maxWidth: 420 }}
        >
          <Search className="size-4" style={{ color: "var(--muted-foreground)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索话术，如：家长嫌贵、谢尔丹、时间规划…"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--foreground)" }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="rounded-full px-3 py-1.5 text-xs"
              style={{
                backgroundColor: category === c ? "var(--primary)" : "var(--card)",
                color: category === c ? "#fff" : "var(--muted-foreground)",
                border: "1px solid " + (category === c ? "var(--primary)" : "var(--border)"),
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 卡片列表 */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-14 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px dashed var(--border)", borderRadius: "16px" }}
        >
          <FolderOpen className="size-8" style={{ color: "var(--input)" }} />
          <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {query ? "没有匹配的话术" : "还没有收藏话术"}
          </div>
          <div className="max-w-sm text-xs" style={{ color: "var(--muted-foreground)" }}>
            在 AI 回复页生成满意的回复后，点击收藏，它会自动归入这里成为你的私人话术资产。
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="card-lift rounded-[16px] p-5"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              {r.customerContext && (
                <p className="mb-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  客户：{r.customerContext}
                </p>
              )}
              <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                {r.content}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {r.favorite && <Star className="size-3.5" style={{ color: "var(--gold)" }} />}
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px]"
                    style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-deep)" }}
                  >
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <button
                  onClick={() => copy(r.id, r.content)}
                  className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs"
                  style={{
                    border: "1px solid var(--border)",
                    color: copiedId === r.id ? "var(--primary-deep)" : "var(--muted-foreground)",
                    backgroundColor: copiedId === r.id ? "var(--primary-light)" : "var(--card)",
                  }}
                >
                  {copiedId === r.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedId === r.id ? "已复制" : "复制"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
