"use client";

// 知识库搜索框：实时搜索知识条目
import { useState, useMemo } from "react";
import { Search, FileText, X } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  category: string;
  reviewStatus: string;
}

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

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

  async function doSearch(q: string) {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/knowledge?search=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.ok) {
        setResults(json.data.slice(0, 10));
      }
    } catch {} finally {
      setSearching(false);
      setSearched(true);
    }
  }

  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (q: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => doSearch(q), 300);
    };
  }, []);

  return (
    <div className="relative">
      <div
        className="relative flex-1 rounded-[16px] bg-white"
        style={{ border: "1px solid var(--gold)", boxShadow: "0 2px 12px rgba(230,91,147,0.06)" }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5" style={{ color: "#94818D" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            debouncedSearch(e.target.value);
          }}
          placeholder="搜索知识，例如：雅思报名、托福考试形式、语言班要求……"
          className="w-full rounded-[16px] py-3.5 pl-11 pr-10 text-sm outline-none"
          style={{ backgroundColor: "transparent", color: "var(--foreground)" }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#94818D" }}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* 搜索结果下拉 */}
      {searched && query.trim() && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-[16px] bg-white z-50 overflow-hidden"
          style={{ border: "1px solid var(--gold)", boxShadow: "0 8px 24px rgba(230,91,147,0.12)" }}
        >
          {searching ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              搜索中…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <FileText className="size-6 mx-auto mb-2" style={{ color: "var(--gold)" }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                没有找到相关知识
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--primary-soft)] transition-colors cursor-pointer"
                >
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                    style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-deep)" }}
                  >
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  <span className="flex-1 truncate text-sm" style={{ color: "var(--foreground)" }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
