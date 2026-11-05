"use client";

// 跟进看板：概览统计 + 筛选 + 新建/编辑 + 待办列表
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Check,
  RotateCcw,
  Pencil,
  Trash2,
  Loader2,
  CalendarClock,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaskCustomer {
  id: string;
  code: string;
}

interface FollowUpTask {
  id: string;
  title: string;
  description: string | null;
  taskType: "CUSTOMER_PROMISED" | "ADVISOR_PROMISED" | "AI_SUGGESTED";
  status: "PENDING" | "DONE" | "CANCELLED";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  customer: TaskCustomer | null;
}

interface Summary {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  pending: number;
  done: number;
}

type FilterKey = "pending" | "overdue" | "today" | "week" | "done" | "canceled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "pending", label: "全部待办" },
  { key: "overdue", label: "已逾期" },
  { key: "today", label: "今日到期" },
  { key: "week", label: "本周到期" },
  { key: "done", label: "已完成" },
  { key: "canceled", label: "已取消" },
];

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER_PROMISED: "客户约定",
  ADVISOR_PROMISED: "顾问承诺",
  AI_SUGGESTED: "AI 建议",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "请求失败");
  return json.data as T;
}

function filterToQuery(key: FilterKey): string {
  switch (key) {
    case "overdue":
      return "scope=overdue";
    case "today":
      return "scope=today";
    case "week":
      return "scope=week";
    case "done":
      return "status=DONE";
    case "canceled":
      return "status=CANCELLED";
    default:
      return "status=PENDING";
  }
}

function isOverdue(task: FollowUpTask): boolean {
  if (task.status !== "PENDING" || !task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function formatDue(task: FollowUpTask): string {
  if (!task.dueDate) return "无截止日期";
  return new Date(task.dueDate).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

const emptyForm = { title: "", description: "", dueDate: "" };

export function FollowUpBoard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchJson<Summary>("/api/follow-ups?summary=1"));
    } catch {
      // 统计失败不阻塞
    }
  }, []);

  const loadTasks = useCallback(async (key: FilterKey) => {
    setLoading(true);
    try {
      const list = await fetchJson<FollowUpTask[]>(`/api/follow-ups?${filterToQuery(key)}`);
      setTasks(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTasks(filter);
  }, [filter, loadTasks]);

  async function refresh() {
    await Promise.all([loadSummary(), loadTasks(filter)]);
  }

  async function submitCreate() {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      await fetchJson("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          dueDate: form.dueDate || null,
        }),
      });
      setForm(emptyForm);
      setShowCreate(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(id: string) {
    if (!editForm.title.trim() || saving) return;
    setSaving(true);
    try {
      await fetchJson(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          dueDate: editForm.dueDate || null,
        }),
      });
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task: FollowUpTask, status: "DONE" | "PENDING") {
    try {
      await fetchJson(`/api/follow-ups/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }

  async function remove(task: FollowUpTask) {
    if (!window.confirm(`确认删除待办「${task.title}」？此操作不可恢复。`)) return;
    try {
      await fetchJson(`/api/follow-ups/${task.id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  function startEdit(task: FollowUpTask) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
  }

  const summaryCards: { key: keyof Summary; label: string; alert?: boolean }[] = [
    { key: "overdue", label: "已逾期", alert: true },
    { key: "dueToday", label: "今日到期" },
    { key: "dueThisWeek", label: "本周到期" },
    { key: "pending", label: "待办总数" },
    { key: "done", label: "已完成" },
  ];

  return (
    <div className="space-y-5">
      {/* 概览统计 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {summaryCards.map((c) => (
          <div
            key={c.key}
            className="rounded-[16px] p-4"
            style={{
              backgroundColor: c.alert && (summary?.[c.key] ?? 0) > 0 ? "#FDECEC" : "#FFFFFF",
              border: "1px solid #F5E0EC",
            }}
          >
            <div className="text-xs" style={{ color: "#94818D" }}>
              {c.label}
            </div>
            <div
              className="mt-1 text-2xl font-semibold"
              style={{ color: c.alert && (summary?.[c.key] ?? 0) > 0 ? "#D05252" : "#302436" }}
            >
              {summary?.[c.key] ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* 逾期提醒横幅 */}
      {(summary?.overdue ?? 0) > 0 && (
        <Alert style={{ backgroundColor: "#FDECEC", border: "1px solid #F5C8C8" }}>
          <AlertTriangle className="size-4" style={{ color: "#D05252" }} />
          <AlertDescription style={{ color: "#B04040" }}>
            有 {summary?.overdue} 项待办已逾期，请尽快处理或调整时间。
          </AlertDescription>
        </Alert>
      )}

      {/* 筛选 + 新建 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: active ? "#E65B93" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#817786",
                  border: "1px solid " + (active ? "#E65B93" : "#F0E0E8"),
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} variant="outline" size="sm">
          {showCreate ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showCreate ? "收起" : "新建待办"}
        </Button>
      </div>

      {/* 新建表单 */}
      {showCreate && (
        <div className="space-y-3 rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
          <div className="text-sm font-medium" style={{ color: "#302436" }}>新建待办</div>
          <Input
            placeholder="待办事项，如：把雅思备考方案发给客户"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
            <Input
              placeholder="补充说明（可选）"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            <Button size="sm" onClick={submitCreate} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              保存待办
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 待办列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color: "#94818D" }}>
            <Loader2 className="size-4 animate-spin" /> 加载中…
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-[18px] py-14 text-center" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
            <CalendarClock className="mx-auto size-7" style={{ color: "#D8C8D2" }} />
            <div className="mt-3 text-sm" style={{ color: "#94818D" }}>当前筛选下没有待办</div>
          </div>
        ) : (
          tasks.map((task) => {
            const overdue = isOverdue(task);
            const done = task.status === "DONE";
            const canceled = task.status === "CANCELLED";

            if (editingId === task.id) {
              return (
                <div key={task.id} className="space-y-3 rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
                    />
                    <Input
                      value={editForm.description}
                      placeholder="补充说明"
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>取消</Button>
                    <Button size="sm" onClick={() => submitEdit(task.id)} disabled={saving}>
                      {saving && <Loader2 className="size-3.5 animate-spin" />} 保存
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={task.id}
                className="rounded-[18px] p-4 md:p-5"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid " + (overdue ? "#F5C8C8" : "#F5E0EC"),
                  opacity: done || canceled ? 0.7 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* 完成/重开按钮 */}
                  <button
                    onClick={() => changeStatus(task, done ? "PENDING" : "DONE")}
                    aria-label={done ? "重新打开" : "标记完成"}
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-all"
                    style={{
                      backgroundColor: done ? "#E65B93" : "transparent",
                      borderColor: done ? "#E65B93" : "#E0D0D8",
                      color: "#FFFFFF",
                    }}
                  >
                    {done ? <Check className="size-3.5" /> : ""}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm font-medium"
                      style={{
                        color: "#302436",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className="rounded-full px-2.5 py-0.5"
                        style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
                      >
                        {TYPE_LABEL[task.taskType]}
                      </span>
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ color: overdue ? "#D05252" : "#94818D" }}
                      >
                        <CalendarClock className="size-3" />
                        {formatDue(task)}
                        {overdue && "（已逾期）"}
                      </span>
                      {task.customer && (
                        <span style={{ color: "#94818D" }}>· {task.customer.code}</span>
                      )}
                      {canceled && <span style={{ color: "#B0A0A8" }}>· 已取消</span>}
                    </div>

                    {task.description && (
                      <div
                        className="mt-2 rounded-lg px-2.5 py-1.5 text-[11px]"
                        style={{ backgroundColor: "#FFF6F9", color: "#817786" }}
                      >
                        {task.description}
                      </div>
                    )}
                  </div>

                  {/* 操作 */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(task)}
                      aria-label="编辑"
                      className="flex size-7 items-center justify-center rounded-lg"
                      style={{ color: "#94818D" }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    {done ? (
                      <button
                        onClick={() => changeStatus(task, "PENDING")}
                        aria-label="重新打开"
                        className="flex size-7 items-center justify-center rounded-lg"
                        style={{ color: "#94818D" }}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => remove(task)}
                      aria-label="删除"
                      className="flex size-7 items-center justify-center rounded-lg"
                      style={{ color: "#C48A96" }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
