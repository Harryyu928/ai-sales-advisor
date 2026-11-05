/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Compass, AlertTriangle, CircleCheck, CircleHelp,
  Target, MessageSquare, FileText, Sparkles, Copy, ChevronRight,
  Users, Clock, TrendingUp, ShieldAlert, History, Quote,
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
  high: "#C0392B",
  medium: "#D68910",
  low: "#B69A76",
};
const severityLabel: Record<string, string> = {
  high: "重点关注", medium: "一般关注", low: "观察",
};

const patternFields: { key: string; label: string; icon: any }[] = [
  { key: "infoPreference", label: "信息获取偏好", icon: FileText },
  { key: "compareBeforeDecide", label: "先比较再决策", icon: TrendingUp },
  { key: "detailSeeking", label: "细节关注度", icon: MessageSquare },
  { key: "priceSensitive", label: "价格敏感度", icon: Target },
  { key: "effectFocus", label: "学习效果关注", icon: CircleCheck },
  { key: "timeFocus", label: "时间安排关注", icon: Clock },
  { key: "facultyFocus", label: "师资服务关注", icon: Users },
  { key: "communicationStyle", label: "沟通节奏", icon: Sparkles },
];

function Ring({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="80" height="80" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--primary)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 42 42)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--primary-deep)">
          {pct}%
        </text>
      </svg>
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
    </div>
  );
}

function EvidenceQuote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mt-1.5 flex items-start gap-1.5 text-xs italic leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
      <Quote className="size-3 shrink-0 mt-0.5" style={{ color: "var(--gold)" }} />
      <span>“{text}”</span>
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
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose`);
      const json = await res.json();
      if (json.ok) {
        setDiag(json.data.diagnostic);
        setVersions(json.data.versions || []);
      } else {
        setError(json.error?.message || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
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
    setDiagnosing(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose`, { method: "POST" });
      const json = await res.json();
      if (json.ok) await load();
      else setError(json.error?.message || "诊断失败");
    } catch {
      setError("诊断请求失败");
    } finally {
      setDiagnosing(false);
    }
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--muted-foreground)" }}>
        <RefreshCw className="size-5 animate-spin mr-2" /> 正在加载诊断报告…
      </div>
    );
  }

  const patterns = diag?.patterns || {};
  const hasPatterns = patternFields.some(f => patterns[f.key] && String(patterns[f.key]).length > 0);

  return (
    <div className="space-y-5">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--primary-deep)" }}>
            客户智能诊断驾驶舱
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {diag
              ? `第 ${diag.version} 版 · ${new Date(diag.createdAt).toLocaleString("zh-CN")} · AI 耗时 ${Math.round(diag.latencyMs / 1000)}s`
              : "尚未生成诊断"}
          </p>
        </div>
        <div className="flex gap-2">
          {versions.length > 1 && (
            <button onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              <History className="size-4" /> 历史({versions.length})
            </button>
          )}
          <button onClick={runDiagnose} disabled={diagnosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--primary)" }}>
            {diagnosing ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {diagnosing ? "AI 诊断中…" : diag ? "重新诊断" : "开始智能诊断"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "#FDECEA", color: "#C0392B" }}>{error}</div>
      )}

      {/* 历史版本抽屉 */}
      {showHistory && versions.length > 1 && (
        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--primary-deep)" }}>诊断历史版本</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {versions.map((v) => (
              <button key={v.id} onClick={() => { loadVersion(v.id); setShowHistory(false); }}
                className="w-full text-left p-2 rounded-lg text-sm hover:bg-[var(--primary-light)] transition-colors"
                style={{ background: v.version === diag?.version ? "var(--primary-light)" : "transparent" }}>
                <span className="font-medium" style={{ color: "var(--foreground)" }}>第 {v.version} 版</span>
                <span className="mx-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(v.createdAt).toLocaleString("zh-CN")}
                </span>
                {v.salesStage && <span className="text-xs" style={{ color: "var(--primary)" }}> · {v.salesStage}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!diag && !loading && (
        <div className="text-center py-16 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <Compass className="size-10 mx-auto mb-3" style={{ color: "var(--primary)" }} />
          <p className="font-medium" style={{ color: "var(--foreground)" }}>还没有诊断报告</p>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted-foreground)" }}>
            点击「开始智能诊断」，AI 将分析该客户的全部聊天记录
          </p>
        </div>
      )}

      {diag && (
        <>
          {/* 第一层：核心诊断仪表 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl p-4 flex justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <Ring value={diag.completeness} label="信息完整度" />
            </div>
            <MetricCard icon={<Target className="size-4" />} label="咨询阶段" value={diag.salesStage} />
            <MetricCard icon={<ShieldAlert className="size-4" />} label="成交风险"
              value={`${diag.risks?.length || 0} 项`}
              highlight={(diag.risks || []).some((r: any) => r.severity === "high")} />
            <MetricCard icon={<CircleCheck className="size-4" />} label="下一步行动"
              value={`${diag.actions?.length || 0} 条建议`} />
          </div>

          {/* 全景摘要 */}
          <Section title="全景诊断摘要" icon={<FileText className="size-4" />}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{diag.summary}</p>
            {diag.limitations && (
              <p className="text-xs mt-2 italic flex items-start gap-1" style={{ color: "var(--gold)" }}>
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> {diag.limitations}
              </p>
            )}
            {patterns.evidenceNote && (
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>📊 {patterns.evidenceNote}</p>
            )}
          </Section>

          {/* 第二层：沟通与决策画像 */}
          {hasPatterns && (
            <Section title="沟通与决策画像" icon={<Users className="size-4" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {patternFields.filter(f => patterns[f.key] && String(patterns[f.key]).length > 0).map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.key} className="p-2.5 rounded-xl" style={{ background: "var(--background)" }}>
                      <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: "var(--primary-deep)" }}>
                        <Icon className="size-3.5" /> {f.label}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>{patterns[f.key]}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs mt-2 italic" style={{ color: "var(--muted-foreground)" }}>
                * 以上为基于当前聊天样本的行为观察，非固定人格判断
              </p>
            </Section>
          )}

          {/* 第三层：需求与顾虑 */}
          <div className="grid lg:grid-cols-2 gap-3">
            <Section title="已确认需求" icon={<CircleCheck className="size-4" />}>
              {(diag.needs || []).length === 0 ? <Empty text="暂未提取到明确需求" /> : (
                <ul className="space-y-2.5">
                  {diag.needs.map((n: any, i: number) => (
                    <li key={i} className="text-sm">
                      <span style={{ color: "var(--foreground)" }}>{n.item}</span>
                      <EvidenceQuote text={n.evidence} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="明确顾虑与待验证" icon={<AlertTriangle className="size-4" />}>
              {(diag.concerns?.stated || []).length === 0 ? <Empty text="暂未发现明确顾虑" /> : (
                <ul className="space-y-2.5">
                  {diag.concerns.stated.map((c: any, i: number) => (
                    <li key={i}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: "var(--foreground)" }}>{c.name}</span>
                        <StatusBadge status={c.resolved} />
                      </div>
                      <EvidenceQuote text={c.evidence} />
                    </li>
                  ))}
                </ul>
              )}
              {(diag.concerns?.hypotheses || []).length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>🔍 待验证假设（非结论）</p>
                  {diag.concerns.hypotheses.map((h: any, i: number) => (
                    <p key={i} className="text-xs leading-relaxed mb-1" style={{ color: "var(--primary-deep)" }}>
                      · {h.name} <span style={{ color: "var(--muted-foreground)" }}>—— {h.reason}</span>
                    </p>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* 风险预警 */}
          {(diag.risks || []).length > 0 && (
            <Section title="成交障碍与风险预警" icon={<ShieldAlert className="size-4" />}>
              <div className="space-y-2">
                {diag.risks.map((r: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border"
                    style={{ borderColor: severityColor[r.severity] || "var(--border)", borderLeftWidth: 3, background: "var(--background)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{r.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: severityColor[r.severity] || "var(--muted-foreground)" }}>
                        {severityLabel[r.severity] || r.severity}
                      </span>
                    </div>
                    <EvidenceQuote text={r.evidence} />
                    {r.impact && <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>可能影响：{r.impact}</p>}
                    {r.suggestion && <p className="text-xs mt-1" style={{ color: "var(--primary-deep)" }}>💡 建议：{r.suggestion}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 信息盲区 + 下一问 */}
          <div className="grid lg:grid-cols-2 gap-3">
            <Section title="信息盲区诊断" icon={<CircleHelp className="size-4" />}>
              {(diag.unknowns || []).length === 0 ? <Empty text="暂无明显信息缺口" /> : (
                <ul className="space-y-1.5">
                  {diag.unknowns.slice(0, 8).map((u: any, i: number) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                      <span className="size-1.5 rounded-full" style={{ background: u.importance === "high" ? "#C0392B" : "var(--primary)" }} />
                      <span style={{ color: "var(--foreground)" }}>{u.field}</span>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {u.status === "asked_no_answer" ? "(问过未答)" : u.status === "conflict" ? "(有冲突)" : "(未问)"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="当前最该问的一个问题" icon={<MessageSquare className="size-4" />}>
              {!diag.nextBestQuestion ? <Empty text="暂无推荐" /> : (
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--primary-deep)" }}>{diag.nextBestQuestion.question}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>为什么问：{diag.nextBestQuestion.why}</p>
                  <div className="mt-2 p-3 rounded-lg text-sm leading-relaxed" style={{ background: "var(--primary-light)", color: "var(--primary-deep)" }}>
                    “{diag.nextBestQuestion.script}”
                    <button onClick={() => copy(diag.nextBestQuestion!.script)}
                      className="ml-2 text-xs underline inline-flex items-center gap-1" style={{ color: "var(--primary)" }}>
                      <Copy className="size-3" /> 复制
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>

          {/* 推荐行动 */}
          {(diag.actions || []).length > 0 && (
            <Section title="推荐下一步销售行动" icon={<ChevronRight className="size-4" />}>
              <div className="space-y-2">
                {diag.actions.map((a: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border flex items-start gap-3" style={{ borderColor: "var(--border)" }}>
                    <span className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white shrink-0" style={{ background: "var(--primary)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{a.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{a.reason}</p>
                      <p className="text-xs mt-1 italic leading-relaxed" style={{ color: "var(--primary-deep)" }}>“{a.script}”</p>
                    </div>
                    <button onClick={() => copy(a.script)} className="text-xs underline shrink-0" style={{ color: "var(--primary)" }}>
                      <Copy className="size-3 inline" /> 复制
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 兴趣偏好 */}
          {(diag.interests || []).length > 0 && (
            <Section title="明确表达的兴趣与关注" icon={<Sparkles className="size-4" />}>
              <div className="flex flex-wrap gap-2">
                {diag.interests.map((it: string, i: number) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--primary-light)", color: "var(--primary-deep)" }}>
                    {it}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: `1px solid ${highlight ? "#C0392B" : "var(--border)"}` }}>
      <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
        {icon} {label}
      </div>
      <p className="text-base font-semibold" style={{ color: highlight ? "#C0392B" : "var(--foreground)" }}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--primary-deep)" }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm italic" style={{ color: "var(--muted-foreground)" }}>{text}</p>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    explained: { label: "已解释", color: "#D68910" },
    confirmed: { label: "已解决", color: "#27AE60" },
    pending: { label: "待确认", color: "#C0392B" },
  };
  const s = map[status] || { label: status, color: "var(--muted-foreground)" };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: s.color }}>
      {s.label}
    </span>
  );
}
