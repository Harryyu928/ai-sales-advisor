/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Compass, AlertTriangle, CircleCheck, CircleHelp,
  Target, MessageSquare, FileText, Sparkles, Copy, Check,
  Users, Clock, ShieldAlert, History, Quote, ChevronDown,
} from "lucide-react";

interface Diagnostic {
  id: string;
  version: number;
  salesStage: string;
  completeness: number;
  summary: string;
  patterns: any;
  interests: string[];
  needs: { item: string; evidence: string }[];
  concerns: {
    stated: { name: string; evidence: string; firstSeen?: string; resolved: string }[];
    hypotheses: { name: string; reason: string }[];
  };
  unknowns: { field: string; status: string; importance: string }[];
  nextBestQuestion: { question: string; why: string; script: string } | null;
  risks: { name: string; severity: string; evidence: string; impact: string; suggestion: string }[];
  actions: { name: string; reason: string; script: string }[];
  limitations: string;
  latencyMs: number;
  createdAt: string;
}

interface VersionInfo {
  id: string;
  version: number;
  createdAt: string;
  salesStage: string | null;
  completeness: number | null;
}

const severityColor: Record<string, string> = {
  high: "#C0392B", medium: "#D68910", low: "#B69A76",
};
const severityLabel: Record<string, string> = {
  high: "重点关注", medium: "一般关注", low: "观察",
};

function Ring({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  const off = c - (animated / 100) * c;
  return (
    <svg width="72" height="72" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--primary)" strokeWidth="7"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        transform="rotate(-90 42 42)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="42" y="47" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--primary-deep)">{pct}%</text>
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all"
      style={{
        background: copied ? "#27AE60" : "var(--primary-light)",
        color: copied ? "#fff" : "var(--primary-deep)",
      }}>
      {copied ? <><Check className="size-3" /> 已复制 ✓</> : <><Copy className="size-3" /> 复制</>}
    </button>
  );
}

function EvidenceQuote({ text, idx }: { text: string; idx?: number }) {
  if (!text) return null;
  return (
    <div className="mt-1 flex items-start gap-1 text-xs italic" style={{ color: "var(--muted-foreground)" }}>
      <Quote className="size-3 shrink-0 mt-0.5" style={{ color: "var(--gold)" }} />
      <span>“{text}”{idx && <span className="not-italic ml-1 px-1 rounded" style={{ background: "var(--primary-light)", color: "var(--primary-deep)" }}>第{idx}条</span>}</span>
    </div>
  );
}

function Collapsible({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  // 手机端（<768px）默认折叠，减少长滚动；桌面端按传入的 defaultOpen
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    return window.innerWidth >= 768 ? defaultOpen : false;
  });
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--background)]">
        <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--primary-deep)" }}>
          {icon} {title}
        </span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--muted-foreground)" }} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

const STAGES = ["读取聊天", "提取事实", "识别盲区", "生成行动"];

function DiagnosingProgress() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = STAGES.map((_, i) =>
      setTimeout(() => setStage(i + 1), (i + 1) * 10000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--card)", border: "1px solid var(--primary)" }}>
      <p className="text-sm font-medium mb-4 text-center" style={{ color: "var(--primary-deep)" }}>
        正在深度分析客户…
      </p>
      <div className="space-y-3">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className="size-6 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: done ? "var(--primary)" : active ? "var(--primary-light)" : "var(--background)",
                  color: done ? "#fff" : active ? "var(--primary)" : "var(--muted-foreground)",
                  border: `1px solid ${done || active ? "var(--primary)" : "var(--border)"}`,
                }}>
                {done ? <Check className="size-3.5" /> : active ? <RefreshCw className="size-3.5 animate-spin" /> : i + 1}
              </div>
              <span className="text-sm" style={{ color: done || active ? "var(--primary-deep)" : "var(--muted-foreground)" }}>
                {label}
              </span>
              {active && <span className="text-xs animate-pulse" style={{ color: "var(--gold)" }}>…</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DiagnosticCockpit({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose`);
      const json = await res.json();
      if (json.ok) { setDiag(json.data.diagnostic); setVersions(json.data.versions || []); }
      else setError(json.error?.message || "加载失败");
    } catch { setError("网络错误"); }
    finally { setLoading(false); }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const loadVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose?versionId=${versionId}`);
      const json = await res.json();
      if (json.ok) setDiag(json.data.diagnostic);
    } catch { /* ignore */ }
  };

  const runDiagnose = async () => {
    setDiagnosing(true); setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose`, { method: "POST" });
      const json = await res.json();
      if (json.ok) await load();
      else setError(json.error?.message || "诊断失败");
    } catch { setError("诊断请求失败"); }
    finally { setDiagnosing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20" style={{ color: "var(--muted-foreground)" }}>
      <RefreshCw className="size-5 animate-spin mr-2" /> 正在加载诊断报告…
    </div>
  );

  const patterns = diag?.patterns || {};
  // 首屏只突出真正的关单风险（category=closing），普通信息缺口不渲染成红色警报
  const closingRisks = (diag?.risks || []).filter((r: any) => r.category === "closing" && r.severity === "high");
  const topRisk = closingRisks[0] || (diag?.risks || []).find((r: any) => r.severity === "high");
  const topConcern = (diag?.concerns?.stated || [])[0];
  const topAction = (diag?.actions || [])[0];

  return (
    <div className="space-y-4">
      {/* 顶部操作 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--primary-deep)" }}>客户智能诊断</h2>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {diag ? `第 ${diag.version} 版 · ${new Date(diag.createdAt).toLocaleString("zh-CN")}` : "尚未诊断"}
          </p>
        </div>
        <div className="flex gap-2">
          {versions.length > 1 && (
            <button onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1.5 rounded-full text-xs border" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              <History className="size-3.5 inline mr-1" /> 历史({versions.length})
            </button>
          )}
          <button onClick={runDiagnose} disabled={diagnosing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}>
            {diagnosing ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {diagnosing ? "诊断中…" : diag ? "重新诊断" : "开始诊断"}
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg text-xs" style={{ background: "#FDECEA", color: "#C0392B" }}>{error}</div>}

      {diagnosing && <DiagnosingProgress />}

      {showHistory && versions.length > 1 && (
        <div className="rounded-2xl p-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {versions.map((v) => (
              <button key={v.id} onClick={() => { loadVersion(v.id); setShowHistory(false); }}
                className="w-full text-left p-1.5 rounded text-xs hover:bg-[var(--primary-light)]">
                第 {v.version} 版 · {new Date(v.createdAt).toLocaleString("zh-CN")} {v.salesStage && `· ${v.salesStage}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {!diag && !loading && (
        <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: "var(--border)" }}>
          <Compass className="size-8 mx-auto mb-2" style={{ color: "var(--primary)" }} />
          <p className="text-sm font-medium">还没有诊断报告</p>
          <p className="text-xs mt-1 mb-3" style={{ color: "var(--muted-foreground)" }}>点击「开始诊断」分析该客户</p>
        </div>
      )}

      {diag && (
        <>
          {/* 首屏 5 件事 */}
          {/* 1. 客户摘要 + 阶段 */}
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, var(--primary-light) 0%, var(--card) 100%)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "var(--primary)" }}>{diag.salesStage}</span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>咨询阶段</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{diag.summary}</p>
            {diag.limitations && <p className="text-xs mt-1.5 italic" style={{ color: "var(--gold)" }}>⚠ {diag.limitations}</p>}
          </div>

          {/* 2. 最大顾虑 */}
          {topConcern && (
            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)", borderLeft: "3px solid #D68910" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "#D68910" }}>最大顾虑</p>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{topConcern.name}</p>
              <EvidenceQuote text={topConcern.evidence} />
            </div>
          )}

          {/* 3. 下一问（可复制） */}
          {diag.nextBestQuestion && (
            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--primary)" }}>
              <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: "var(--primary)" }}>
                <MessageSquare className="size-3.5" /> 现在最该问
              </p>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>{diag.nextBestQuestion.question}</p>
              <div className="mt-2 p-3 rounded-lg text-sm leading-relaxed" style={{ background: "var(--primary-light)", color: "var(--primary-deep)" }}>
                “{diag.nextBestQuestion.script}”
              </div>
              <div className="mt-2 flex justify-end">
                <CopyButton text={diag.nextBestQuestion.script} />
              </div>
            </div>
          )}

          {/* 4. 今日行动 */}
          {topAction && (
            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--primary-deep)" }}>问完以后 → {topAction.name}</p>
              <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>{topAction.reason}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs italic flex-1" style={{ color: "var(--primary-deep)" }}>“{topAction.script}”</p>
                <CopyButton text={topAction.script} />
              </div>
            </div>
          )}

          {/* 5. 完整度 + 风险概览 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <Ring value={diag.completeness} />
                <div>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>信息完整度</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>
                    {Math.round(diag.completeness * 100)}% 已确认
                  </p>
                </div>
              </div>
              {(diag.unknowns || []).filter((u: any) => u.importance === "high").length > 0 && (
                <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                  高优先缺失：{(diag.unknowns || []).filter((u: any) => u.importance === "high").map((u: any) => u.field).join("、")}
                </p>
              )}
            </div>
            <div className="rounded-2xl p-3" style={{ background: "var(--card)", border: `1px solid ${closingRisks.length > 0 ? "#C0392B" : "var(--border)"}` }}>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>关单风险</p>
              <p className="text-base font-semibold mt-0.5" style={{ color: closingRisks.length > 0 ? "#C0392B" : "var(--foreground)" }}>
                {closingRisks.length > 0 ? `${closingRisks.length} 项紧急` : "暂无"}
              </p>
              {topRisk && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{topRisk.name}</p>}
            </div>
          </div>

          {/* 折叠区：详细分析 */}
          <Collapsible title="沟通与决策画像" icon={<Users className="size-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(patterns).filter(([k, v]) => k !== "evidenceNote" && v && String(v).length > 0).map(([k, v]) => (
                <div key={k} className="p-2 rounded-lg" style={{ background: "var(--background)" }}>
                  <p className="text-xs font-medium" style={{ color: "var(--primary-deep)" }}>{k}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>{String(v)}</p>
                </div>
              ))}
            </div>
            {patterns.evidenceNote && <p className="text-xs mt-2 italic" style={{ color: "var(--muted-foreground)" }}>📊 {patterns.evidenceNote}</p>}
          </Collapsible>

          <Collapsible title={`已确认需求 (${diag.needs?.length || 0})`} icon={<CircleCheck className="size-4" />}>
            <ul className="space-y-2">
              {(diag.needs || []).map((n: any, i: number) => (
                <li key={i} className="text-sm">
                  {n.item}<EvidenceQuote text={n.evidence} />
                </li>
              ))}
            </ul>
          </Collapsible>

          <Collapsible title={`全部顾虑与待验证 (${diag.concerns?.stated?.length || 0} 明确 + ${diag.concerns?.hypotheses?.length || 0} 假设)`} icon={<AlertTriangle className="size-4" />}>
            <ul className="space-y-2">
              {(diag.concerns?.stated || []).map((c: any, i: number) => (
                <li key={i}>
                  <div className="flex justify-between"><span className="text-sm">{c.name}</span><StatusBadge status={c.resolved} /></div>
                  <EvidenceQuote text={c.evidence} />
                </li>
              ))}
            </ul>
            {(diag.concerns?.hypotheses || []).length > 0 && (
              <div className="mt-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>待验证假设</p>
                {diag.concerns.hypotheses.map((h: any, i: number) => (
                  <p key={i} className="text-xs" style={{ color: "var(--primary-deep)" }}>· {h.name} —— {h.reason}</p>
                ))}
              </div>
            )}
          </Collapsible>

          <Collapsible title={`成交风险详情 (${diag.risks?.length || 0})`} icon={<ShieldAlert className="size-4" />}>
            <div className="space-y-2">
              {(diag.risks || []).map((r: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg border-l-2" style={{ borderColor: severityColor[r.severity], background: "var(--background)" }}>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: severityColor[r.severity] }}>{severityLabel[r.severity]}</span>
                  </div>
                  <EvidenceQuote text={r.evidence} />
                  {r.suggestion && <p className="text-xs mt-1" style={{ color: "var(--primary-deep)" }}>💡 {r.suggestion}</p>}
                </div>
              ))}
            </div>
          </Collapsible>

          <Collapsible title={`信息盲区 (${diag.unknowns?.length || 0})`} icon={<CircleHelp className="size-4" />}>
            <ul className="space-y-1">
              {(diag.unknowns || []).map((u: any, i: number) => (
                <li key={i} className="text-xs flex items-center gap-2">
                  <span className="size-1.5 rounded-full" style={{ background: u.importance === "high" ? "#C0392B" : "var(--primary)" }} />
                  {u.field}
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {u.status === "asked_no_answer" ? "(问过未答)" : u.status === "conflict" ? "(冲突)" : "(未问)"}
                  </span>
                </li>
              ))}
            </ul>
          </Collapsible>

          <Collapsible title={`全部推荐行动 (${diag.actions?.length || 0})`} icon={<Target className="size-4" />}>
            <div className="space-y-2">
              {(diag.actions || []).map((a: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                  <p className="text-sm font-medium">{i + 1}. {a.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{a.reason}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs italic flex-1 mr-2" style={{ color: "var(--primary-deep)" }}>“{a.script}”</p>
                    <CopyButton text={a.script} />
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>

          {(diag.interests || []).length > 0 && (
            <Collapsible title="兴趣与关注" icon={<Sparkles className="size-4" />}>
              <div className="flex flex-wrap gap-2">
                {diag.interests.map((it: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--primary-light)", color: "var(--primary-deep)" }}>{it}</span>
                ))}
              </div>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    explained: { label: "已解释", color: "#D68910" },
    confirmed: { label: "已解决", color: "#27AE60" },
    pending: { label: "待确认", color: "#C0392B" },
  };
  const s = map[status] || { label: status, color: "var(--muted-foreground)" };
  return <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: s.color }}>{s.label}</span>;
}
