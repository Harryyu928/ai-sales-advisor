"use client";

// 效果分析看板：漏斗指标 + 趋势柱状图 + 分布 + 模型洞察
import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Star,
  Send,
  ThumbsUp,
  ShieldCheck,
  Clock,
  Type,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  EffectMetrics,
  EffectInsight,
  NameCount,
} from "@/services/effect-analysis-service";

interface AnalysisData {
  metrics: EffectMetrics;
  insight: EffectInsight | null;
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  sub,
}: {
  icon: typeof Star;
  label: string;
  value: string | number;
  suffix?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-[16px] p-4"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5" style={{ color: "var(--primary)" }} />
        <span className="text-[11px]" style={{ color: "#94818D" }}>{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold" style={{ color: "var(--foreground)" }}>
        {value}
        {suffix && <span className="ml-0.5 text-sm" style={{ color: "#94818D" }}>{suffix}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[10px]" style={{ color: "#94818D" }}>{sub}</div>}
    </div>
  );
}

function BarList({ items, empty }: { items: NameCount[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) {
    return <div className="py-4 text-center text-[11px]" style={{ color: "#94818D" }}>{empty}</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-24 shrink-0 truncate text-[11px]" style={{ color: "#5A4A54" }} title={item.name}>
            {item.name}
          </div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--primary-light)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-deep) 100%)",
              }}
            />
          </div>
          <div className="w-6 shrink-0 text-right text-[11px] font-medium" style={{ color: "var(--foreground)" }}>
            {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "action" }) {
  const color =
    tone === "good" ? "#2D9B7E" : tone === "warn" ? "#C47A20" : "var(--primary-deep)";
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium" style={{ color: "#94818D" }}>{title}</div>
      {items.length === 0 ? (
        <div className="text-[11px]" style={{ color: "#94818D" }}>暂无</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: "#5A4A54" }}>
              <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EffectAnalysisBoard() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/effect-analysis");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "加载失败");
      setData(json.data as AnalysisData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin mr-2" style={{ color: "var(--primary)" }} />
        <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>正在统计分析…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error || "数据加载失败"}</span>
          <button onClick={load} className="flex items-center gap-1 text-xs underline">
            <RefreshCw className="size-3" /> 重试
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const { metrics, insight } = data;
  const trendMax = Math.max(1, ...metrics.dailyTrend.map((d) => d.count));

  return (
    <div className="space-y-5">
      {/* 漏斗指标 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="有效生成" value={metrics.total} sub={`失败 ${metrics.failed} · 重生成 ${metrics.regenerated}`} />
        <StatCard icon={ShieldCheck} label="质检通过率" value={metrics.qualityPassRate} suffix="%" sub={`${metrics.qualityPassed} 条通过`} />
        <StatCard icon={Star} label="收藏率" value={metrics.collectRate} suffix="%" sub={`${metrics.collected} 条收藏`} />
        <StatCard icon={Send} label="发送率" value={metrics.sendRate} suffix="%" sub={`${metrics.sent} 条确认发送`} />
        <StatCard icon={ThumbsUp} label="标记有效率" value={metrics.effectiveRate} suffix="%" sub={`${metrics.effective} 条效果好`} />
        <StatCard icon={Clock} label="平均耗时" value={(metrics.avgLatencyMs / 1000).toFixed(1)} suffix="s" />
        <StatCard icon={Type} label="平均回复长度" value={metrics.avgReplyLength} suffix="字" />
        <StatCard icon={CheckCircle2} label="话术库总数" value={metrics.savedReplyStatusCounts.reduce((s, i) => s + i.count, 0)} />
      </div>

      {/* 近 14 天趋势 */}
      <div className="rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4" style={{ color: "var(--primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>近 14 天生成趋势</span>
        </div>
        <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
          {metrics.dailyTrend.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
              <span className="text-[9px]" style={{ color: "#94818D" }}>{d.count > 0 ? d.count : ""}</span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${(d.count / trendMax) * 80}%`,
                  minHeight: d.count > 0 ? 4 : 2,
                  background: "linear-gradient(180deg, var(--primary) 0%, #F0A8C8 100%)",
                }}
                title={`${d.name}: ${d.count}`}
              />
              <span className="text-[8px]" style={{ color: "#94818D" }}>{d.name.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 分布 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>质检问题分布</span>
          </div>
          <BarList items={metrics.qualityIssueCounts} empty="暂无质检问题" />
        </div>
        <div className="rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}>
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="size-4" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>咨询阶段分布</span>
          </div>
          <BarList items={metrics.stageCounts} empty="暂无阶段数据" />
        </div>
      </div>

      {/* 模型洞察 */}
      <div className="rounded-[18px] p-5" style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="size-4" style={{ color: "var(--primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>智能改进建议</span>
        </div>
        {insight ? (
          <div className="space-y-4">
            {insight.summary && (
              <p className="rounded-[12px] p-3 text-xs leading-relaxed" style={{ backgroundColor: "#FFF6F9", color: "#5A4A54" }}>
                {insight.summary}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InsightList title="做得好" items={insight.strengths} tone="good" />
              <InsightList title="需改进" items={insight.weaknesses} tone="warn" />
              <InsightList title="下一步行动" items={insight.actions} tone="action" />
            </div>
          </div>
        ) : (
          <div className="text-[11px]" style={{ color: "#94818D" }}>
            洞察生成不可用，以上指标可直接用于复盘。
          </div>
        )}
      </div>
    </div>
  );
}
