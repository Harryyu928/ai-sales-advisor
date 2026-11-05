"use client";

// 待确认信息面板（功能5）：列出客户 DISPUTED 矛盾事实，支持采用新说法 / 保留原记录
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DisputedFact {
  id: string;
  fieldKey: string;
  value: string;
  createdAt: string;
}

interface DisputeGroup {
  fieldKey: string;
  oldValue: string;
  newValue: string;
}

const FIELD_LABELS: Record<string, string> = {
  contactRole: "联系身份",
  targetCountry: "目标国家",
  targetSchool: "目标院校",
  targetMajor: "目标专业",
  targetExam: "目标考试",
  targetScore: "目标分数",
  currentLevel: "当前水平",
  budgetRange: "预算范围",
  applicationStage: "申请阶段",
  salesStage: "销售阶段",
  plannedExamDate: "计划考试时间",
  concerns: "主要顾虑",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

export function DisputePanel({ customerId }: { customerId: string }) {
  const [groups, setGroups] = useState<DisputeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/disputes`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "加载失败");
      const facts = json.data as DisputedFact[];

      // 按 fieldKey 分组，createdAt 升序：旧值在前、新值在后
      const map = new Map<string, DisputedFact[]>();
      for (const f of facts) {
        const list = map.get(f.fieldKey) ?? [];
        list.push(f);
        map.set(f.fieldKey, list);
      }
      const grouped: DisputeGroup[] = [];
      for (const [fieldKey, list] of map) {
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        if (list.length >= 2) {
          grouped.push({
            fieldKey,
            oldValue: list[0].value,
            newValue: list[list.length - 1].value,
          });
        }
      }
      setGroups(grouped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(fieldKey: string, decision: "NEW" | "OLD") {
    if (resolvingKey) return;
    setResolvingKey(fieldKey);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, decision }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "裁决失败");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "裁决失败");
    } finally {
      setResolvingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[20px] bg-white p-5" style={{ border: "1px solid #F5E0EC" }}>
        <Loader2 className="size-4 animate-spin" style={{ color: "#E65B93" }} />
        <span className="text-xs" style={{ color: "#817786" }}>加载待确认信息…</span>
      </div>
    );
  }

  // 无待确认矛盾时不占用页面空间
  if (groups.length === 0 && !error) return null;

  return (
    <div className="rounded-[20px] p-5" style={{ backgroundColor: "#FFF8F0", border: "1px solid #F0E0C8" }}>
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="size-4" style={{ color: "#C47A20" }} />
        <h2 className="text-sm font-semibold" style={{ color: "#8A6A3A" }}>
          待确认信息（{groups.length}）
        </h2>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={load} className="flex items-center gap-1 text-xs underline">
              <RefreshCw className="size-3" /> 重试
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <div
            key={g.fieldKey}
            className="rounded-[14px] bg-white p-4"
            style={{ border: "1px solid #F0E0C8" }}
          >
            <div className="text-xs font-medium" style={{ color: "#302436" }}>
              {fieldLabel(g.fieldKey)}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-[10px] p-2.5" style={{ backgroundColor: "#FFFAFC" }}>
                <div className="text-[10px]" style={{ color: "#94818D" }}>原记录</div>
                <div className="mt-0.5 text-xs" style={{ color: "#5A4A54" }}>{g.oldValue}</div>
              </div>
              <div className="rounded-[10px] p-2.5" style={{ backgroundColor: "#FFF1F6" }}>
                <div className="text-[10px]" style={{ color: "#C82E72" }}>本次新说法</div>
                <div className="mt-0.5 text-xs" style={{ color: "#543C49" }}>{g.newValue}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => decide(g.fieldKey, "NEW")}
                disabled={resolvingKey === g.fieldKey}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-white"
                style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
              >
                {resolvingKey === g.fieldKey ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
                采用新说法
              </button>
              <button
                onClick={() => decide(g.fieldKey, "OLD")}
                disabled={resolvingKey === g.fieldKey}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium"
                style={{ backgroundColor: "#FFFAFC", color: "#817786", border: "1px solid #E0D0D8" }}
              >
                保留原记录
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
