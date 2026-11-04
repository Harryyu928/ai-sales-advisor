"use client";

// AI 推荐回复面板 V4.0：风格选择 + 生成回复 + 复制/编辑 + 沟通分析
import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, RefreshCw, Edit3, ChevronDown, Target, Flag, Lightbulb, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STYLE_PRESETS, type StylePreset } from "@/lib/reply-prompts";

interface ReplyPanelProps {
  conversationId: string;
  disabled?: boolean;
}

interface AnalysisResult {
  customerNeed: string;
  stage: string;
  keyInfo: string[];
  nextStep: string;
  sentiment: string;
}

export function ReplyPanel({ conversationId, disabled }: ReplyPanelProps) {
  const [style, setStyle] = useState<StylePreset>("professional");
  const [reply, setReply] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ latencyMs: number; model: string } | null>(null);

  // 沟通分析
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  // 页面加载时自动分析
  useEffect(() => {
    analyze();
  }, [conversationId]);

  async function analyze() {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/analyze`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setAnalysis(json.data);
      }
    } catch {
      // 静默失败，不打扰用户
    } finally {
      setAnalyzing(false);
    }
  }

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "生成失败");
        return;
      }
      setReply(json.data.reply);
      setDraft(json.data.reply);
      setMeta({ latencyMs: json.data.latencyMs, model: json.data.model });
    } catch {
      setError("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    const text = editing ? draft : reply;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("复制失败，请手动选择复制");
    }
  }

  const stageColors: Record<string, string> = {
    "初次咨询": "#5B8FD6",
    "需求确认": "#E65B93",
    "方案讨论": "#2D9B7E",
    "价格敏感": "#C47A20",
    "即将签约": "#8B5CF6",
    "售后跟进": "#817786",
  };

  return (
    <div
      className="rounded-[20px] p-5 md:p-6"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC", boxShadow: "0 2px 12px rgba(230,91,147,0.05)" }}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="flex size-8 items-center justify-center rounded-[10px]"
          style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
        >
          <Sparkles className="size-4 text-white" />
        </div>
        <h3 className="font-semibold" style={{ color: "#302436" }}>
          AI 推荐回复
        </h3>
        {meta && (
          <span className="text-xs" style={{ color: "#817786" }}>
            · {(meta.latencyMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* 风格选择 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(STYLE_PRESETS) as [StylePreset, { label: string; description: string }][]).map(
          ([key, s]) => (
            <button
              key={key}
              onClick={() => setStyle(key)}
              disabled={generating}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: style === key ? "#FCE7F0" : "#FFFAFC",
                color: style === key ? "#C82E72" : "#817786",
                border: style === key ? "1px solid #F0C8DC" : "1px solid #F5E0EC",
              }}
            >
              {s.label}
            </button>
          )
        )}
      </div>

      {/* 生成按钮 */}
      {!reply && !generating && (
        <Button
          onClick={generate}
          disabled={disabled}
          className="w-full h-11 text-white transition-all duration-200 hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
        >
          <Sparkles className="size-4" />
          生成建议回复
        </Button>
      )}

      {generating && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="size-5 animate-spin mr-2" style={{ color: "#E65B93" }} />
          <span className="text-sm" style={{ color: "#817786" }}>
            AI 正在生成回复…
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm mt-2" style={{ color: "#D94052" }}>
          {error}
        </p>
      )}

      {/* 回复内容 */}
      {reply && !generating && (
        <div className="space-y-4">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full rounded-[12px] p-4 text-sm leading-relaxed"
              style={{
                backgroundColor: "#FFF1F6",
                border: "1px solid #F0C8DC",
                color: "#302436",
                resize: "vertical",
              }}
            />
          ) : (
            <div
              className="rounded-[14px] p-4 text-sm leading-[1.7]"
              style={{ backgroundColor: "#FFF1F6", color: "#543C49" }}
            >
              {reply}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={copy}
              disabled={generating}
              className="h-10 px-4 text-white"
              style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "已复制" : "复制回复"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (editing) {
                  setReply(draft);
                  setEditing(false);
                } else {
                  setEditing(true);
                }
              }}
              disabled={generating}
              className="h-10"
            >
              <Edit3 className="size-4" />
              {editing ? "保存" : "编辑"}
            </Button>
            <Button
              variant="outline"
              onClick={generate}
              disabled={generating}
              className="h-10"
            >
              <RefreshCw className={`size-4 ${generating ? "animate-spin" : ""}`} />
              重新生成
            </Button>
          </div>

          {copied && (
            <p className="text-xs" style={{ color: "#2D9B7E" }}>
              已复制，可直接粘贴到微信
            </p>
          )}
        </div>
      )}

      {/* 沟通分析折叠面板 */}
      {(analysis || analyzing) && (
        <div className="mt-5 pt-5" style={{ borderTop: "1px solid #F5E0EC" }}>
          <button
            onClick={() => setAnalysisOpen(!analysisOpen)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4" style={{ color: "#E65B93" }} />
              <span className="text-sm font-medium" style={{ color: "#302436" }}>
                沟通分析
              </span>
              {analyzing && (
                <RefreshCw className="size-3.5 animate-spin" style={{ color: "#E65B93" }} />
              )}
            </div>
            <ChevronDown
              className="size-4 transition-transform duration-200"
              style={{
                color: "#817786",
                transform: analysisOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {analysisOpen && analysis && (
            <div className="mt-4 space-y-4">
              {/* 客户需求 */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="size-3.5" style={{ color: "#E65B93" }} />
                  <span className="text-xs font-medium" style={{ color: "#817786" }}>
                    客户需求
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#302436" }}>
                  {analysis.customerNeed || "—"}
                </p>
              </div>

              {/* 咨询阶段 */}
              {analysis.stage && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Flag className="size-3.5" style={{ color: "#E65B93" }} />
                    <span className="text-xs font-medium" style={{ color: "#817786" }}>
                      咨询阶段
                    </span>
                  </div>
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: "#FCE7F0",
                      color: stageColors[analysis.stage] || "#C82E72",
                    }}
                  >
                    {analysis.stage}
                  </span>
                </div>
              )}

              {/* 关键信息 */}
              {analysis.keyInfo && analysis.keyInfo.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="size-3.5" style={{ color: "#E65B93" }} />
                    <span className="text-xs font-medium" style={{ color: "#817786" }}>
                      关键信息
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.keyInfo.map((info, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: "#543C49" }}>
                        <span className="mt-1.5 size-1 rounded-full" style={{ backgroundColor: "#E65B93" }} />
                        {info}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 下一步建议 */}
              {analysis.nextStep && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="size-3.5" style={{ color: "#E65B93" }} />
                    <span className="text-xs font-medium" style={{ color: "#817786" }}>
                      下一步建议
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#302436" }}>
                    {analysis.nextStep}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
