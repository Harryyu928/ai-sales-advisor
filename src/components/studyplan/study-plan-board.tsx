"use client";

// 备考路径看板：客户选择 + 手动背景 + 生成 + 结果展示 + 历史方案
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  ClipboardCheck,
  Copy,
  Check,
  Trash2,
  GraduationCap,
  ChevronDown,
  Lightbulb,
  Flag,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CustomerOption {
  id: string;
  code: string;
  targetExam: string | null;
  targetScore: string | null;
  currentLevel: string | null;
  plannedExamDate: string | null;
}

interface StudyPhase {
  name: string;
  focus: string;
  milestone: string;
}

interface StudyPlanData {
  goal: string;
  missingInfo: string[];
  assessmentAdvice: string;
  phases: StudyPhase[];
  risks: string[];
  wechatVersion: string;
}

interface GeneratedResult {
  plan: StudyPlanData;
  record: { id: string };
}

interface HistoryItem {
  id: string;
  planData: StudyPlanData;
  wechatVersion: string | null;
  createdAt: string;
  customer: { id: string; code: string } | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "请求失败");
  return json.data as T;
}

const manualEmpty = {
  targetExam: "",
  targetScore: "",
  currentLevel: "",
  plannedExamDate: "",
  weeklyHours: "",
  extraNote: "",
};

export function StudyPlanBoard() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [manual, setManual] = useState(manualEmpty);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchJson<CustomerOption[]>("/api/customers")
      .then(setCustomers)
      .catch(() => {});
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchJson<HistoryItem[]>("/api/study-plans"));
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const payload = {
        customerId: customerId || null,
        targetExam: manual.targetExam || undefined,
        targetScore: manual.targetScore || undefined,
        currentLevel: manual.currentLevel || undefined,
        plannedExamDate: manual.plannedExamDate || undefined,
        weeklyHours: manual.weeklyHours || undefined,
        extraNote: manual.extraNote || undefined,
      };
      const r = await fetchJson<GeneratedResult>("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setResult(r);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }

  async function copyWechat(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("复制失败，请手动复制");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("确认删除这份备考方案？")) return;
    try {
      await fetchJson(`/api/study-plans/${id}`, { method: "DELETE" });
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  const canGenerate =
    customerId !== "" ||
    Boolean(manual.targetExam || manual.currentLevel || manual.targetScore);

  function renderPlan(plan: StudyPlanData) {
    return (
      <div className="space-y-4">
        {plan.goal && (
          <div>
            <div className="text-xs font-medium" style={{ color: "#94818D" }}>备考目标</div>
            <div className="mt-1 text-sm font-medium" style={{ color: "#302436" }}>{plan.goal}</div>
          </div>
        )}

        {plan.assessmentAdvice && (
          <Alert style={{ backgroundColor: "#FFF4E8", border: "1px solid #F5DDB8" }}>
            <Lightbulb className="size-4" style={{ color: "#C47A20" }} />
            <AlertDescription style={{ color: "#A06A20" }}>{plan.assessmentAdvice}</AlertDescription>
          </Alert>
        )}

        {plan.missingInfo.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-medium" style={{ color: "#94818D" }}>待补充信息</div>
            <div className="flex flex-wrap gap-1.5">
              {plan.missingInfo.map((m, i) => (
                <span key={i} className="rounded-full px-2.5 py-1 text-[11px]" style={{ backgroundColor: "#FFF1F6", color: "#C82E72" }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {plan.phases.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#94818D" }}>
              <Flag className="size-3.5" /> 学习阶段
            </div>
            <div className="space-y-2.5">
              {plan.phases.map((p, i) => (
                <div key={i} className="flex gap-3 rounded-[12px] p-3" style={{ backgroundColor: "#FFFAFC", border: "1px solid #F5E0EC" }}>
                  <div
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold" style={{ color: "#302436" }}>{p.name}</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: "#5A4A54" }}>{p.focus}</div>
                    {p.milestone && (
                      <div className="mt-1 text-[11px]" style={{ color: "#C47A20" }}>评估节点：{p.milestone}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.risks.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#94818D" }}>
              <AlertTriangle className="size-3.5" /> 风险与注意
            </div>
            <ul className="space-y-1">
              {plan.risks.map((r, i) => (
                <li key={i} className="text-[11px]" style={{ color: "#817786" }}>· {r}</li>
              ))}
            </ul>
          </div>
        )}

        {plan.wechatVersion && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#94818D" }}>
                <ClipboardCheck className="size-3.5" /> 微信沟通版
              </div>
              <Button size="xs" variant="outline" onClick={() => copyWechat(plan.wechatVersion)}>
                {copied ? (
                  <>
                    <Check className="size-3" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> 复制
                  </>
                )}
              </Button>
            </div>
            <div
              className="whitespace-pre-wrap rounded-[12px] p-3.5 text-xs leading-relaxed"
              style={{ backgroundColor: "#FFF6F9", color: "#5A4A54" }}
            >
              {plan.wechatVersion}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 生成表单 */}
      <div className="space-y-4 rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
        <div className="text-sm font-medium" style={{ color: "#302436" }}>生成备考路径</div>

        {/* 客户选择 */}
        <div>
          <label className="mb-1.5 block text-xs" style={{ color: "#94818D" }}>选择客户（自动带入档案，可选）</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-8 w-full rounded-lg border px-2.5 text-sm outline-none"
            style={{ borderColor: "#E0D0D8", backgroundColor: "transparent", color: "#302436" }}
          >
            <option value="">不指定客户，手动填写信息</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        </div>

        {/* 手动字段 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="目标考试，如 雅思/托福/PTE" value={manual.targetExam} onChange={(e) => setManual((p) => ({ ...p, targetExam: e.target.value }))} />
          <Input placeholder="目标分数，如 6.5" value={manual.targetScore} onChange={(e) => setManual((p) => ({ ...p, targetScore: e.target.value }))} />
          <Input placeholder="当前语言基础，如 四级 500 分" value={manual.currentLevel} onChange={(e) => setManual((p) => ({ ...p, currentLevel: e.target.value }))} />
          <Input type="date" value={manual.plannedExamDate} onChange={(e) => setManual((p) => ({ ...p, plannedExamDate: e.target.value }))} />
          <Input placeholder="每周可投入时间，如 10 小时" value={manual.weeklyHours} onChange={(e) => setManual((p) => ({ ...p, weeklyHours: e.target.value }))} />
          <Input placeholder="其他补充（可选）" value={manual.extraNote} onChange={(e) => setManual((p) => ({ ...p, extraNote: e.target.value }))} />
        </div>

        <div className="flex justify-end">
          <Button onClick={generate} disabled={generating || !canGenerate}>
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 生成中…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> 生成备考路径
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 最新结果 */}
      {result && (
        <div className="rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "#302436" }}>
            <GraduationCap className="size-4" style={{ color: "#E65B93" }} /> 生成结果
          </div>
          {renderPlan(result.plan)}
        </div>
      )}

      {/* 历史方案 */}
      <div className="rounded-[18px]" style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-medium" style={{ color: "#302436" }}>
            历史方案（{history.length}）
          </span>
          <ChevronDown className={`size-4 transition-transform ${showHistory ? "rotate-180" : ""}`} style={{ color: "#94818D" }} />
        </button>
        {showHistory && (
          <div className="space-y-4 border-t px-5 py-4">
            {history.length === 0 ? (
              <div className="py-6 text-center text-xs" style={{ color: "#94818D" }}>暂无历史方案</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="rounded-[14px] p-4" style={{ backgroundColor: "#FFFAFC", border: "1px solid #F5E0EC" }}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[11px]" style={{ color: "#94818D" }}>
                      {h.customer ? h.customer.code + " · " : ""}
                      {new Date(h.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <button onClick={() => remove(h.id)} aria-label="删除" style={{ color: "#C48A96" }}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {renderPlan(h.planData)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
