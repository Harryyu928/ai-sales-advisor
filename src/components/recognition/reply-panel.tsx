"use client";

// AI 推荐回复面板 V2.0：风格选择 + 生成 + 质检提醒 + 复制/编辑 + 收藏/发送/效果 + 专业依据 + 沟通分析
import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Copy, Check, RefreshCw, Edit3, ChevronDown, Target, Flag, Lightbulb,
  MessageCircle, Star, Send, ThumbsUp, BookMarked, AlertTriangle, Info, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STYLE_PRESETS, type StylePreset } from "@/lib/reply-prompts";

interface ReplyPanelProps {
  conversationId: string;
  disabled?: boolean;
}

interface PotentialConcern {
  concern: string;
  certainty: "FACT" | "HYPOTHESIS";
  evidence: string;
  confidence: number;
}
interface Contradiction {
  fieldKey: string;
  newValue: string;
  previousValue: string;
  confirmPhrase: string;
}
interface KnowledgeReference {
  id: string;
  title: string;
  category: string;
  examType: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  effectiveDate: string | null;
  score: number;
}
interface QualityIssue {
  code: string;
  message: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}
interface QualityResult {
  passed: boolean;
  issues: QualityIssue[];
  warnings: QualityIssue[];
  autoFixed: boolean;
  finalText: string;
}
interface AnalysisResult {
  currentQuestion: string;
  explicitNeeds: string[];
  potentialConcerns: PotentialConcern[];
  attitudeChange: string;
  stage: string;
  confirmedInfo: string[];
  needConfirmInfo: string[];
  recommendedDirection: string;
  contradictions: Contradiction[];
}
interface ReplyResult {
  generationId: string;
  reply: string;
  quality: QualityResult;
  analysis: AnalysisResult;
  knowledgeReferences: KnowledgeReference[];
  timing: Record<string, number>;
  totalLatencyMs: number;
  model: string;
}
interface SimulationResponse {
  tendency: string;
  customerReply: string;
  advisorTip: string;
}
interface SimulationResultData {
  disclaimer: string;
  responses: SimulationResponse[];
}

export function ReplyPanel({ conversationId, disabled }: ReplyPanelProps) {
  const [style, setStyle] = useState<StylePreset>("professional");
  const [result, setResult] = useState<ReplyResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 优秀话术状态
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 折叠区
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // 多轮客户沟通模拟（功能10）
  const [simulation, setSimulation] = useState<SimulationResultData | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simOpen, setSimOpen] = useState(false);

  // 切换对话时重置
  useEffect(() => {
    setResult(null);
    setSavedId(null);
    setSavedStatus(null);
    setEditing(false);
    setError(null);
    setSimulation(null);
    setSimOpen(false);
  }, [conversationId]);

  const currentText = editing ? draft : result?.reply ?? "";

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, applyMemory: true }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "生成失败");
        return;
      }
      const data = json.data as ReplyResult;
      setResult(data);
      setDraft(data.reply);
      setSavedId(null);
      setSavedStatus(null);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("复制失败，请手动选择复制");
    }
  }

  // 收藏为优秀话术
  const collect = useCallback(async () => {
    if (!result || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/saved-replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentText,
          generationId: result.generationId,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setSavedId(json.data.id);
      setSavedStatus(json.data.status);
    } catch (e) {
      setError((e as Error).message || "收藏失败");
    } finally {
      setActionLoading(false);
    }
  }, [result, currentText, actionLoading]);

  // 标记实际发送 / 效果好
  async function markAction(action: "SENT" | "EFFECTIVE") {
    if (!savedId || actionLoading) {
      // 未收藏时先收藏再标记
      if (!savedId) await collect();
    }
    if (!savedId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/saved-replies/${savedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setSavedStatus(json.data.status);
    } catch (e) {
      setError((e as Error).message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  }

  // 多轮模拟：基于当前（可能编辑过的）回复，模拟客户反应
  async function runSimulation() {
    if (simLoading || !currentText.trim()) return;
    setSimLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, draftReply: currentText }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "模拟失败");
      setSimulation(json.data as SimulationResultData);
      setSimOpen(true);
    } catch (e) {
      setError((e as Error).message || "模拟失败");
    } finally {
      setSimLoading(false);
    }
  }

  const stageColors: Record<string, string> = {
    "初次咨询": "#5B8FD6", "需求确认": "#E65B93", "方案讨论": "#2D9B7E",
    "价格敏感": "#C47A20", "即将签约": "#8B5CF6", "售后跟进": "#817786",
  };

  const highIssues = result?.quality.issues.filter((i) => i.severity === "HIGH") ?? [];
  const otherWarnings = result?.quality.warnings ?? [];

  return (
    <div
      className="rounded-[20px] p-5 md:p-6"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC", boxShadow: "0 2px 12px rgba(230,91,147,0.05)" }}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex size-8 items-center justify-center rounded-[10px]"
          style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}>
          <Sparkles className="size-4 text-white" />
        </div>
        <h3 className="font-semibold" style={{ color: "#302436" }}>AI 推荐回复</h3>
        {result && (
          <span className="text-xs" style={{ color: "#817786" }}>
            · {(result.totalLatencyMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* 风格选择 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(STYLE_PRESETS) as [StylePreset, { label: string }][]).map(([key, s]) => (
          <button key={key} onClick={() => setStyle(key)} disabled={generating}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: style === key ? "#FCE7F0" : "#FFFAFC",
              color: style === key ? "#C82E72" : "#817786",
              border: style === key ? "1px solid #F0C8DC" : "1px solid #F5E0EC",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {!result && !generating && (
        <Button onClick={generate} disabled={disabled}
          className="w-full h-11 text-white hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}>
          <Sparkles className="size-4" />生成建议回复
        </Button>
      )}

      {generating && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="size-5 animate-spin mr-2" style={{ color: "#E65B93" }} />
          <span className="text-sm" style={{ color: "#817786" }}>AI 正在分析客户并生成回复…</span>
        </div>
      )}

      {error && <p className="text-sm mt-2" style={{ color: "#D94052" }}>{error}</p>}

      {result && !generating && (
        <div className="space-y-4">
          {/* 严重质检提醒 */}
          {highIssues.length > 0 && (
            <div className="rounded-[12px] p-3.5 space-y-2"
              style={{ backgroundColor: "#FDECEC", border: "1px solid #F5C6C6" }}>
              {highIssues.map((i, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: "#D94052" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "#B23242" }}>{i.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* 回复内容 */}
          {editing ? (
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5}
              className="w-full rounded-[12px] p-4 text-sm leading-relaxed"
              style={{ backgroundColor: "#FFF1F6", border: "1px solid #F0C8DC", color: "#302436", resize: "vertical" }} />
          ) : (
            <div className="rounded-[14px] p-4 text-sm leading-[1.7]"
              style={{ backgroundColor: "#FFF1F6", color: "#543C49" }}>
              {currentText}
            </div>
          )}

          {/* 主操作 */}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={copy}
              className="h-10 px-4 text-white"
              style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "已复制" : "复制回复"}
            </Button>
            <Button variant="outline" onClick={() => {
              if (editing) { setResult({ ...result, reply: draft }); setEditing(false); }
              else { setEditing(true); }
            }} className="h-10">
              <Edit3 className="size-4" />{editing ? "保存" : "编辑"}
            </Button>
            <Button variant="outline" onClick={generate} className="h-10">
              <RefreshCw className="size-4" />重新生成
            </Button>
          </div>

          {/* 话术沉淀操作：收藏 / 确认发送 / 效果好 */}
          <div className="flex flex-wrap items-center gap-2 pt-1"
            style={{ borderTop: "1px dashed #F0C8DC" }}>
            <Button variant="outline" onClick={collect} disabled={actionLoading || !!savedId} className="h-9 text-xs">
              <Star className="size-3.5" style={{ color: savedId ? "#E65B93" : undefined }} />
              {savedId ? "已收藏" : "收藏为优秀话术"}
            </Button>
            <Button variant="outline" onClick={() => markAction("SENT")}
              disabled={actionLoading || savedStatus === "SENT" || savedStatus === "EFFECTIVE"}
              className="h-9 text-xs">
              <Send className="size-3.5" />
              {savedStatus === "SENT" || savedStatus === "EFFECTIVE" ? "已确认发送" : "确认实际发送"}
            </Button>
            <Button variant="outline" onClick={() => markAction("EFFECTIVE")}
              disabled={actionLoading || savedStatus === "EFFECTIVE"} className="h-9 text-xs">
              <ThumbsUp className="size-3.5" />
              {savedStatus === "EFFECTIVE" ? "已标记效果好" : "标记沟通效果好"}
            </Button>
            <Button variant="outline" onClick={runSimulation}
              disabled={simLoading || !currentText.trim()} className="h-9 text-xs">
              {simLoading ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Users className="size-3.5" />
              )}
              {simLoading ? "模拟中…" : "模拟客户反应"}
            </Button>
          </div>
          <p className="text-[11px]" style={{ color: "#94818D" }}>
            复制不等于发送，收藏不等于客户满意；请按实际情况确认，系统会据此学习你的风格。
          </p>

          {/* 普通质检警告（折叠式轻提示） */}
          {otherWarnings.length > 0 && (
            <div className="rounded-[12px] p-3 space-y-1.5"
              style={{ backgroundColor: "#FFF8F0", border: "1px solid #F0E0C8" }}>
              {otherWarnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Info className="size-3.5 mt-0.5 shrink-0" style={{ color: "#C47A20" }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: "#8A6A3A" }}>{w.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* 多轮客户沟通模拟结果（功能10） */}
          {simulation && (
            <div className="pt-3" style={{ borderTop: "1px solid #F5E0EC" }}>
              <button onClick={() => setSimOpen(!simOpen)} className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4" style={{ color: "#E65B93" }} />
                  <span className="text-sm font-medium" style={{ color: "#302436" }}>
                    客户反应模拟（{simulation.responses.length}）
                  </span>
                </div>
                <ChevronDown className="size-4 transition-transform" style={{ color: "#817786", transform: simOpen ? "rotate(180deg)" : "rotate(0)" }} />
              </button>
              {simOpen && (
                <div className="mt-3 space-y-3">
                  <p className="text-[11px]" style={{ color: "#94818D" }}>{simulation.disclaimer}</p>
                  {simulation.responses.map((r, i) => (
                    <div key={i} className="rounded-[12px] p-3"
                      style={{ backgroundColor: "#FFFAFC", border: "1px solid #F5E0EC" }}>
                      <span className="rounded-full px-2.5 py-0.5 text-[10px]"
                        style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}>
                        {r.tendency}
                      </span>
                      <div className="mt-2 text-xs leading-relaxed" style={{ color: "#543C49" }}>
                        <span className="font-medium" style={{ color: "#C82E72" }}>客户可能：</span>
                        {r.customerReply}
                      </div>
                      {r.advisorTip && (
                        <div className="mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed"
                          style={{ backgroundColor: "#FFF6F9", color: "#8A6A78" }}>
                          接话建议：{r.advisorTip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 专业依据折叠区 */}
          {result.knowledgeReferences.length > 0 && (
            <div className="pt-3" style={{ borderTop: "1px solid #F5E0EC" }}>
              <button onClick={() => setEvidenceOpen(!evidenceOpen)} className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookMarked className="size-4" style={{ color: "#E65B93" }} />
                  <span className="text-sm font-medium" style={{ color: "#302436" }}>专业依据（{result.knowledgeReferences.length}）</span>
                </div>
                <ChevronDown className="size-4 transition-transform" style={{ color: "#817786", transform: evidenceOpen ? "rotate(180deg)" : "rotate(0)" }} />
              </button>
              {evidenceOpen && (
                <div className="mt-3 space-y-3">
                  {result.knowledgeReferences.map((ref) => {
                    const expired = ref.effectiveDate ? new Date(ref.effectiveDate) < new Date() : false;
                    return (
                      <div key={ref.id} className="rounded-[12px] p-3"
                        style={{ backgroundColor: "#FFFAFC", border: "1px solid #F5E0EC" }}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-medium" style={{ color: "#302436" }}>{ref.title}</p>
                          {expired && (
                            <span className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{ backgroundColor: "#FDECEC", color: "#D94052" }}>可能已过期</span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: "#817786" }}>
                          {ref.examType && <span>考试：{ref.examType}</span>}
                          {ref.sourceType && <span>来源：{ref.sourceType}</span>}
                          {ref.verifiedAt && <span>核实：{ref.verifiedAt.slice(0, 10)}</span>}
                        </div>
                        {ref.sourceUrl && (
                          <a href={ref.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="mt-1 inline-block text-[11px]" style={{ color: "#C82E72" }}>
                            查看官方来源 ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 沟通分析折叠区 */}
          <div className="pt-3" style={{ borderTop: "1px solid #F5E0EC" }}>
            <button onClick={() => setAnalysisOpen(!analysisOpen)} className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4" style={{ color: "#E65B93" }} />
                <span className="text-sm font-medium" style={{ color: "#302436" }}>沟通分析</span>
              </div>
              <ChevronDown className="size-4 transition-transform" style={{ color: "#817786", transform: analysisOpen ? "rotate(180deg)" : "rotate(0)" }} />
            </button>

            {analysisOpen && (
              <div className="mt-4 space-y-4">
                {result.analysis.currentQuestion && (
                  <Section icon={Target} title="客户当前问题">
                    <p className="text-sm" style={{ color: "#302436" }}>{result.analysis.currentQuestion}</p>
                  </Section>
                )}

                {result.analysis.explicitNeeds.length > 0 && (
                  <Section icon={Lightbulb} title="显性需求（客户明确表达）">
                    <ul className="space-y-1">
                      {result.analysis.explicitNeeds.map((n, i) => (
                        <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: "#543C49" }}>
                          <span className="mt-1.5 size-1 rounded-full" style={{ backgroundColor: "#E65B93" }} />{n}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {result.analysis.potentialConcerns.length > 0 && (
                  <Section icon={Flag} title="潜在顾虑（区分事实与推测）">
                    <div className="space-y-2">
                      {result.analysis.potentialConcerns.map((c, i) => (
                        <div key={i} className="rounded-[10px] p-2.5"
                          style={{ backgroundColor: c.certainty === "FACT" ? "#FCE7F0" : "#FFFAFC", border: "1px solid #F5E0EC" }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={c.certainty === "FACT"
                                ? { backgroundColor: "#E65B93", color: "#fff" }
                                : { backgroundColor: "#F0E4F2", color: "#817786" }}>
                              {c.certainty === "FACT" ? "明确表达" : "可能性推测"}
                            </span>
                            <p className="text-xs font-medium" style={{ color: "#302436" }}>{c.concern}</p>
                          </div>
                          {c.evidence && (
                            <p className="mt-1 text-[11px]" style={{ color: "#817786" }}>依据：{c.evidence}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* 矛盾提醒 */}
                {result.analysis.contradictions.length > 0 && (
                  <Section icon={AlertTriangle} title="信息变化提醒">
                    <div className="space-y-2">
                      {result.analysis.contradictions.map((c, i) => (
                        <div key={i} className="rounded-[10px] p-2.5"
                          style={{ backgroundColor: "#FFF8F0", border: "1px solid #F0E0C8" }}>
                          <p className="text-xs" style={{ color: "#8A6A3A" }}>
                            {c.fieldKey}：此前「{c.previousValue || "未记录"}」→ 本次「{c.newValue}」
                          </p>
                          {c.confirmPhrase && (
                            <p className="mt-1 text-[11px]" style={{ color: "#543C49" }}>可这样确认：{c.confirmPhrase}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {result.analysis.stage && (
                  <Section icon={Flag} title="咨询阶段">
                    <span className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "#FCE7F0", color: stageColors[result.analysis.stage] || "#C82E72" }}>
                      {result.analysis.stage}
                    </span>
                  </Section>
                )}

                {result.analysis.confirmedInfo.length > 0 && (
                  <Section icon={Check} title="已确认信息">
                    <ul className="space-y-1">
                      {result.analysis.confirmedInfo.map((n, i) => (
                        <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: "#543C49" }}>
                          <Check className="size-3.5 mt-0.5" style={{ color: "#2D9B7E" }} />{n}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {result.analysis.needConfirmInfo.length > 0 && (
                  <Section icon={Info} title="待确认信息">
                    <ul className="space-y-1">
                      {result.analysis.needConfirmInfo.map((n, i) => (
                        <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: "#543C49" }}>
                          <span className="mt-1.5 size-1 rounded-full" style={{ backgroundColor: "#C47A20" }} />{n}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {result.analysis.recommendedDirection && (
                  <Section icon={Lightbulb} title="最合适沟通方向">
                    <p className="text-sm" style={{ color: "#302436" }}>{result.analysis.recommendedDirection}</p>
                  </Section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: typeof Target; title: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="size-3.5" style={{ color: "#E65B93" }} />
        <span className="text-xs font-medium" style={{ color: "#817786" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
