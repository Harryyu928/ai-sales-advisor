"use client";

// 销售资料看板：搜索/类型筛选/收藏 + 新建编辑 + 卡片网格 + 一键复制
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Star,
  Copy,
  Check,
  Pencil,
  Trash2,
  Loader2,
  X,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SalesMaterial {
  id: string;
  title: string;
  materialType: string;
  content: string | null;
  fileUrl: string | null;
  favorite: boolean;
  status: string;
  tags: string[] | null;
  updatedAt: string;
}

const TYPE_OPTIONS = [
  ["COURSE_INTRO", "课程介绍"],
  ["PRICE_LIST", "价格表"],
  ["ONE_ON_ONE", "一对一"],
  ["GROUP_CLASS", "班课"],
  ["ASSESSMENT", "测评"],
  ["TRIAL", "试听"],
  ["SERVICE_SCOPE", "服务范围"],
  ["FAQ", "常见问题"],
  ["ADVANTAGE", "机构优势"],
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTIONS);

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "请求失败");
  return json.data as T;
}

interface FormState {
  title: string;
  materialType: string;
  content: string;
  fileUrl: string;
  tags: string;
  favorite: boolean;
}

const emptyForm: FormState = {
  title: "",
  materialType: "COURSE_INTRO",
  content: "",
  fileUrl: "",
  tags: "",
  favorite: false,
};

export function MaterialsBoard() {
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("materialType", typeFilter);
      if (favOnly) params.set("favorite", "1");
      if (q.trim()) params.set("q", q.trim());
      const list = await fetchJson<SalesMaterial[]>(`/api/materials?${params.toString()}`);
      setMaterials(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, favOnly, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function copyContent(material: SalesMaterial) {
    if (!material.content) return;
    try {
      await navigator.clipboard.writeText(material.content);
      setCopiedId(material.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      window.alert("复制失败，请手动选择复制");
    }
  }

  async function toggleStar(material: SalesMaterial) {
    try {
      await fetchJson(`/api/materials/${material.id}`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(material: SalesMaterial) {
    setEditingId(material.id);
    setForm({
      title: material.title,
      materialType: material.materialType,
      content: material.content ?? "",
      fileUrl: material.fileUrl ?? "",
      tags: material.tags?.join("，") ?? "",
      favorite: material.favorite,
    });
    setFormOpen(true);
  }

  async function submit() {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    const payload = {
      title: form.title,
      materialType: form.materialType,
      content: form.content || null,
      fileUrl: form.fileUrl || null,
      tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      favorite: form.favorite,
    };
    try {
      if (editingId) {
        await fetchJson(`/api/materials/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setFormOpen(false);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(material: SalesMaterial) {
    if (!window.confirm(`确认删除资料「${material.title}」？此操作不可恢复。`)) return;
    try {
      await fetchJson(`/api/materials/${material.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  // 筛选按钮：全部 + 9 类型
  const filterChips = [{ v: "", l: "全部" }, ...TYPE_OPTIONS.map(([v, l]) => ({ v, l }))];

  return (
    <div className="space-y-5">
      {/* 搜索 + 新建 */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="搜索资料标题或内容…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-48 flex-1"
        />
        <Button
          variant={favOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFavOnly((v) => !v)}
        >
          <Star className="size-3.5" /> 收藏
        </Button>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" /> 新建资料
        </Button>
      </div>

      {/* 类型筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {filterChips.map((c) => {
          const active = typeFilter === c.v;
          return (
            <button
              key={c.v}
              onClick={() => setTypeFilter(c.v)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: active ? "#E65B93" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#817786",
                border: "1px solid " + (active ? "#E65B93" : "#F0E0E8"),
              }}
            >
              {c.l}
            </button>
          );
        })}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 新建/编辑表单 */}
      {formOpen && (
        <div className="space-y-3 rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "#302436" }}>
              {editingId ? "编辑资料" : "新建资料"}
            </span>
            <button onClick={() => setFormOpen(false)} aria-label="关闭" style={{ color: "#94818D" }}>
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="资料标题"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <select
              value={form.materialType}
              onChange={(e) => setForm((p) => ({ ...p, materialType: e.target.value }))}
              className="h-8 rounded-lg border px-2.5 text-sm outline-none"
              style={{ borderColor: "#E0D0D8", backgroundColor: "transparent", color: "#302436" }}
            >
              {TYPE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <Textarea
            placeholder="可复制文字（常用话术/资料正文）"
            rows={5}
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="文件链接（可选，https://…）"
              value={form.fileUrl}
              onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))}
            />
            <Input
              placeholder="标签，用逗号分隔（可选）"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: "#817786" }}>
            <input
              type="checkbox"
              checked={form.favorite}
              onChange={(e) => setForm((p) => ({ ...p, favorite: e.target.checked }))}
            />
            收藏置顶
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>取消</Button>
            <Button size="sm" onClick={submit} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="size-3.5 animate-spin" />} 保存
            </Button>
          </div>
        </div>
      )}

      {/* 卡片网格 */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color: "#94818D" }}>
          <Loader2 className="size-4 animate-spin" /> 加载中…
        </div>
      ) : materials.length === 0 ? (
        <div className="rounded-[18px] py-14 text-center" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
          <FolderOpen className="mx-auto size-7" style={{ color: "#D8C8D2" }} />
          <div className="mt-3 text-sm" style={{ color: "#94818D" }}>还没有资料，点击「新建资料」开始</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex flex-col rounded-[18px] p-5"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}
            >
              {/* 头部 */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "#302436" }}>
                    {m.title}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px]"
                      style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
                    >
                      {TYPE_LABEL[m.materialType] ?? m.materialType}
                    </span>
                    {m.tags?.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px]" style={{ color: "#A094A0" }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggleStar(m)}
                  aria-label="收藏"
                  style={{ color: m.favorite ? "#E65B93" : "#D0C4CC" }}
                >
                  <Star className="size-4" fill={m.favorite ? "#E65B93" : "none"} />
                </button>
              </div>

              {/* 内容 */}
              {m.content && (
                <div
                  className="mt-3 flex-1 whitespace-pre-wrap rounded-[12px] p-3 text-xs leading-relaxed"
                  style={{ backgroundColor: "#FFF6F9", color: "#5A4A54", maxHeight: 160, overflow: "hidden" }}
                >
                  {m.content}
                </div>
              )}

              {/* 底部操作 */}
              <div className="mt-3 flex items-center gap-1.5">
                {m.content && (
                  <Button size="xs" variant="outline" onClick={() => copyContent(m)}>
                    {copiedId === m.id ? (
                      <>
                        <Check className="size-3" /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" /> 复制
                      </>
                    )}
                  </Button>
                )}
                {m.fileUrl && (
                  <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="xs" variant="outline">
                      <ExternalLink className="size-3" /> 文件
                    </Button>
                  </a>
                )}
                <div className="flex-1" />
                <button onClick={() => openEdit(m)} aria-label="编辑" className="flex size-7 items-center justify-center rounded-lg" style={{ color: "#94818D" }}>
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => remove(m)} aria-label="删除" className="flex size-7 items-center justify-center rounded-lg" style={{ color: "#C48A96" }}>
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
