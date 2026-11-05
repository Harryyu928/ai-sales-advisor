"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, Compass, AlertTriangle, CircleCheck, CircleHelp,
  Target, MessageSquare, FileText, Sparkles, Copy, ChevronRight,
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
    stated: { name: string; evidence: string; resolved: string }[];
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

const severityColor: Record<string, string> = {
  high: "#C0392B",
  medium: "#D68910",
  low: "#B69A76",
};

const severityLabel: Record<string, string> = {
  high: "重点关注",
  medium: "一般关注",
  low: "观察",
};

function Ring({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="42" cy="42" r={r} fill="none"
          stroke="var(--primary)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 42 42)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="42" y="47" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--foreground)">
          {pct}%
        </text>
      </svg>
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
    </div>
  );
}

export function DiagnosticCockpit({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose`);
      const json = await res.json();
      if (json.ok) {
        setDiag(json.data.diagnostic);
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

  const runDiagnose = async () => {
    setDiagnosing(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/diagnose`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        await load();
      } else {
        setError(json.error?.message || "诊断失败");
      }
    } catch {
      setError("诊断请求失败");
    } finally {
      setDiagnosing(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--muted-foreground)" }}>
        <RefreshCw className="size-5 animate-spin mr-2" /> 正在加载诊断报告…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--primary-deep)" }}>
            客户诊断驾驶舱
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {diag ? `第 ${diag.version} 版诊断 · ${new Date(diag.createdAt).toLocaleString("zh-CN")} · AI 耗时 ${Math.round(diag.latencyMs / 1000)}s` : "尚未生成诊断"}
          </p>
        </div>
        <button
          onClick={runDiagnose}
          disabled={diagnosing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {diagnosing ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {diagnosing ? "AI 诊断中…" : diag ? "重新诊断" : "开始智能诊断"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "#FDECEA", color: "#C0392B" }}>
          {error}
        </div>
      )}

      {!diag && !loading && (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <Compass className="size-10 mx-auto mb-3" style={{ color: "var(--primary)" }} />
          <p className="font-medium" style={{ color: "var(--foreground)" }}>还没有诊断报告</p>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted-foreground)" }}>
            点击「开始智能诊断」，AI 将分析该客户的全部聊天记录
          </p>
        </div>
      )}

      {diag && (
        <>
          {/* 核心指标层 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl p-4 flex justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <Ring value={diag.completeness} label="信息完整度" />
            </div>
            <MetricCard icon={<Target className="size-4" />} label="咨询阶段" value={diag.salesStage} />
            <MetricCard
              icon={<AlertTriangle className="size-4" />}
              label="成交风险"
              value={`${diag.risks?.length || 0} 项`}
              highlight={(diag.risks || []).some((r: any) => r.severity === "high")}
            />
            <MetricCard
              icon={<CircleCheck className="size-4" />}
              label="下一步建议"
              value={`${diag.actions?.length || 0} 条行动`}
            />
          </div>

          {/* 全景摘要 */}
          <Section title="全景摘要" icon={<FileText className="size-4" />}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{diag.summary}</p>
            {diag.limitations && (
              <p className="text-xs mt-2 italic" style={{ color: "var(--muted-foreground)" }}>⚠ {diag.limitations}</p>
            )}
          </Section>

          {/* 需求与顾虑 */}
          <div className="grid lg:grid-cols-2 gap-3">
            <Section title="已确认需求" icon={<CircleCheck className="size-4" />}>
              {(diag.needs || []).length === 0 ? (
                <Empty text="暂未提取到明确需求" />
              ) : (
                <ul className="space-y-2">
                  {diag.needs.map((n, i) => (
                    <li key={i} className="text-sm">
                      <span style={{ color: "var(--foreground)" }}>{n.item}</span>
                      <p className="text-xs mt-0.5 italic" style={{ color: "var(--muted-foreground)" }}>“{n.evidence}”</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="明确顾虑" icon={<AlertTriangle className="size-4" />}>
              {(diag.concerns?.stated || []).length === 0 ? (
                <Empty text="暂未发现明确顾虑" />
              ) : (
                <ul className="space-y-2">
                  {diag.concerns.stated.map((c, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span style={{ color: "var(--foreground)" }}>{c.name}</span>
                        <StatusBadge status={c.resolved} />
                      </div>
                      <p className="text-xs mt-0.5 italic" style={{ color: "var(--muted-foreground)" }}>“{c.evidence}”</p>
                    </li>
                  ))}
                </ul>
              )}
              {(diag.concerns?.hypotheses || []).length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>待验证假设</p>
                  {diag.concerns.hypotheses.map((h, i) => (
                    <p key={i} className="text-xs" style={{ color: "var(--primary-deep)" }}>· {h.name} —— {h.reason}</p>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* 风险预警 */}
          {(diag.risks || []).length > 0 && (
            <Section title="成交障碍与风险" icon={<AlertTriangle className="size-4" />}>
              <div className="space-y-2">
                {diag.risks.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{r.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: severityColor[r.severity] || "var(--muted-foreground)" }}>
                        {severityLabel[r.severity] || r.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>证据：{r.evidence}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>建议：{r.suggestion}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 未知问题 + 下一问 */}
          <div className="grid lg:grid-cols-2 gap-3">
            <Section title="信息盲区" icon={<CircleHelp className="size-4" />}>
              {(diag.unknowns || []).length === 0 ? (
                <Empty text="暂无明显信息缺口" />
              ) : (
                <ul className="space-y-1.5">
                  {diag.unknowns.slice(0, 6).map((u, i) => (
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

            <Section title="🎯 当前最该问的一个问题" icon={<MessageSquare className="size-4" />}>
              {!diag.nextBestQuestion ? (
                <Empty text="暂无推荐" />
              ) : (
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--primary-deep)" }}>{diag.nextBestQuestion.question}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>为什么问：{diag.nextBestQuestion.why}</p>
                  <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "var(--primary-light)", color: "var(--primary-deep)" }}>
                    “{diag.nextBestQuestion.script}”
                    <button onClick={() => copy(diag.nextBestQuestion!.script)} className="ml-2 text-xs underline inline-flex items-center gap-1">
                      <Copy className="size-3" /> 复制
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>

          {/* 推荐行动 */}
          {(diag.actions || []).length > 0 && (
            <Section title="推荐下一步行动" icon={<ChevronRight className="size-4" />}>
              <div className="space-y-2">
                {diag.actions.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl border flex items-start gap-3" style={{ borderColor: "var(--border)" }}>
                    <span className="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white shrink-0" style={{ background: "var(--primary)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{a.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{a.reason}</p>
                      <p className="text-xs mt-1 italic" style={{ color: "var(--primary-deep)" }}>“{a.script}”</p>
                    </div>
                    <button onClick={() => copy(a.script)} className="text-xs underline shrink-0" style={{ color: "var(--primary)" }}>
                      <Copy className="size-3 inline" /> 复制话术
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 兴趣偏好 */}
          {(diag.interests || []).length > 0 && (
            <Section title="兴趣与关注" icon={<Sparkles className="size-4" />}>
              <div className="flex flex-wrap gap-2">
                {diag.interests.map((it, i) => (
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
    <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
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
    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: s.color }}>
      {s.label}
    </span>
  );
}
