"use client";

// 第二阶段核心工作流：上传截图 → 调整顺序 → AI 识别 → 结构化展示与纠错 → 最近识别记录
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  ArrowUp,
  ArrowDown,
  X,
  History,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadZone, type UploadedAsset } from "@/components/screenshots/upload-zone";
import { PasteText } from "@/components/home/paste-text";
import {
  ConversationView,
  type ConversationData,
} from "@/components/recognition/conversation-view";

interface SessionAsset {
  id: string;
  originalName: string;
  preview: string;
}

interface RecentConversation {
  id: string;
  title: string | null;
  createdAt: string;
  source: string | null;
  _count: { messages: number; screenshots: number };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "请求失败");
  return json.data as T;
}

export function AnalyzeWorkflow() {
  const [assets, setAssets] = useState<SessionAsset[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [recent, setRecent] = useState<RecentConversation[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(false);

  const loadRecent = useCallback(async () => {
    try {
      const data = await fetchJson<{ count: number; conversations: RecentConversation[] }>(
        "/api/conversations"
      );
      setRecent(data.conversations);
    } catch {
      // 历史加载失败不阻塞主流程
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const onUploaded = useCallback((list: UploadedAsset[], previews: string[]) => {
    setAssets((prev) => [
      ...prev,
      ...list.map((a, i) => ({
        id: a.id,
        originalName: a.originalName,
        preview: previews[i] ?? "",
      })),
    ]);
    setConversation(null);
    setError(null);
  }, []);

  function moveAsset(index: number, dir: -1 | 1) {
    setAssets((prev) => {
      const next = [...prev];
      const t = index + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setConversation(null);
  }

  async function analyze() {
    if (assets.length === 0 || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const data = await fetchJson<ConversationData>("/api/screenshots/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: assets.map((a) => a.id) }),
      });
      setConversation(data);
      loadRecent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "识别失败，请重试");
    } finally {
      setAnalyzing(false);
    }
  }

  async function reanalyze() {
    if (conversation) await analyze();
  }

  async function viewConversation(id: string) {
    setViewingId(id);
    try {
      const data = await fetchJson<ConversationData>(`/api/conversations/${id}`);
      setConversation(data);
      setShowRecent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载对话失败");
    } finally {
      setViewingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <UploadZone onUploaded={onUploaded} />

      {/* 粘贴文字识别 */}
      <PasteText
        onParsed={(conversationId, messages) => {
          // 加载解析好的对话
          viewConversation(conversationId);
        }}
      />

      {/* 本次识别批次：排序与开始识别 */}
      {assets.length > 0 && (
        <div
          className="space-y-3 card-lift rounded-[18px] p-5"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}
        >
          <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            待识别截图（{assets.length} 张）—— 第 1 张为最早截图
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {assets.map((a, i) => (
              <div key={a.id} className="group relative overflow-hidden rounded-lg border">
                {a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.preview}
                    alt={`截图 ${i + 1}`}
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    {a.originalName}
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {i + 1}
                </span>
                <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                  <button
                    onClick={() => moveAsset(i, -1)}
                    disabled={i === 0}
                    aria-label="前移"
                    className="flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    onClick={() => moveAsset(i, 1)}
                    disabled={i === assets.length - 1}
                    aria-label="后移"
                    className="flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeAsset(a.id)}
                  aria-label="移除"
                  className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={analyze} disabled={analyzing || assets.length === 0} className="min-w-32">
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  识别中…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  开始识别
                </>
              )}
            </Button>
            {analyzing && (
              <span className="text-xs text-muted-foreground">
                正在调用豆包视觉模型识别多张截图（通常 5-15 秒）
              </span>
            )}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* 识别结果：结构化对话 + 人工纠错 */}
      {conversation && !analyzing && (
        <div
          className="rounded-[18px] p-5"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}
        >
          {conversation.recognitionMeta?.model === "mock-vision-fixture" && (
            <Alert className="mb-4">
              <AlertDescription>
                <span className="font-medium">模拟识别模式：</span>
                当前未连接真实视觉模型（未配置 ARK_API_KEY），此结果由本地模拟返回，仅用于验证流程。
                配置 API Key 后将自动切换为真实识别。
              </AlertDescription>
            </Alert>
          )}
          <ConversationView
            conversation={conversation}
            onChanged={setConversation}
            onReanalyze={reanalyze}
            reanalyzing={analyzing}
          />
        </div>
      )}

      {/* 最近识别记录 */}
      <div
        className="rounded-[18px]"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}
      >
        <button
          onClick={() => setShowRecent((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
            <History className="size-4" style={{ color: "var(--primary)" }} />
            最近识别记录
            {!loadingRecent && recent.length > 0 && (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-deep)" }}>
                {recent.length}
              </span>
            )}
          </span>
          <ChevronRight
            className={`size-4 transition-transform ${showRecent ? "rotate-90" : ""}`}
            style={{ color: "#94818D" }}
          />
        </button>
        {showRecent && (
          <div className="border-t px-4 py-2">
            {loadingRecent ? (
              <p className="py-3 text-center text-sm text-muted-foreground">加载中…</p>
            ) : recent.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                暂无识别记录。上传截图并点击「开始识别」后，结构化对话会保存在这里。
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => viewConversation(c.id)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left rounded-lg transition-colors"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--primary-soft)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <span className="truncate text-sm" style={{ color: "var(--foreground)" }}>{c.title ?? "未命名对话"}</span>
                      <span className="shrink-0 text-xs" style={{ color: "#94818D" }}>
                        {c._count.messages} 条消息 · {c._count.screenshots} 张截图 ·{" "}
                        {new Date(c.createdAt).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {viewingId === c.id && <Loader2 className="ml-1 inline size-3 animate-spin" />}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
