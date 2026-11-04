"use client";

// 识别结果展示与人工纠错：柔雾粉聊天气泡视图
import { useState } from "react";
import {
  Pencil,
  Trash2,
  Check,
  Copy,
  RefreshCw,
  TriangleAlert,
  User,
  Bot,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReplyPanel } from "@/components/recognition/reply-panel";

export type MessageRole = "ADVISOR" | "CUSTOMER" | "UNKNOWN";

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderRole: MessageRole;
  content: string;
  sequence: number;
  timestamp: string | null;
  note: string | null;
  confidence: number | null;
  manuallyCorrected: boolean;
  sourceImage: { id: string; originalName: string } | null;
}

export interface ConversationScreenshot {
  id: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  title: string | null;
  source: string | null;
  recognitionMeta: {
    model?: string;
    latencyMs?: number;
    uncertainties?: string[];
    sourceImageCount?: number;
  } | null;
  messages: ConversationMessage[];
  screenshots: ConversationScreenshot[];
}

const ROLE_LABEL: Record<MessageRole, string> = {
  ADVISOR: "顾问",
  CUSTOMER: "客户",
  UNKNOWN: "未知",
};

function avatarBg(role: MessageRole) {
  if (role === "ADVISOR") return "#FCE7F0";
  if (role === "CUSTOMER") return "#FFF1F6";
  return "#F5E0EC";
}
function avatarColor(role: MessageRole) {
  if (role === "ADVISOR") return "#E65B93";
  if (role === "CUSTOMER") return "#C82E72";
  return "#817786";
}

function avatarIcon(role: MessageRole) {
  if (role === "ADVISOR") return <Bot className="size-4" />;
  if (role === "CUSTOMER") return <User className="size-4" />;
  return <HelpCircle className="size-4" />;
}

interface MessageRowProps {
  message: ConversationMessage;
  onSaved: (m: ConversationMessage) => void;
  onDeleted: (messageId: string) => void;
}

function MessageRow({ message, onSaved, onDeleted }: MessageRowProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ role: message.senderRole, content: message.content });

  const isRight = message.senderRole === "ADVISOR";
  const isUnknown = message.senderRole === "UNKNOWN";

  async function save() {
    const body: { senderRole?: string; content?: string } = {};
    if (draft.role !== message.senderRole) body.senderRole = draft.role;
    if (draft.content !== message.content) body.content = draft.content;
    if (Object.keys(body).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/conversations/${message.conversationId}/messages/${message.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "保存失败");
        return;
      }
      onSaved(json.data);
      setEditing(false);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("确认删除这条消息？删除后需重新识别才能恢复。")) return;
    try {
      const res = await fetch(
        `/api/conversations/${message.conversationId}/messages/${message.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.ok) {
        window.alert(json.error || "删除失败");
        return;
      }
      onDeleted(message.id);
    } catch {
      window.alert("网络错误，请重试");
    }
  }

  if (editing) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5E0EC" }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: "#817786" }}>发言方：</span>
          {(["CUSTOMER", "ADVISOR", "UNKNOWN"] as MessageRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setDraft((d) => ({ ...d, role: r }))}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: draft.role === r ? "#FCE7F0" : "#FFF1F6",
                color: draft.role === r ? "#C82E72" : "#817786",
                border: draft.role === r ? "1px solid #F0C8DC" : "1px solid #F5E0EC",
              }}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <Textarea
          value={draft.content}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
          rows={3}
          autoFocus
        />
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "保存中…" : (
              <>
                <Check className="size-3.5" />
                保存
              </>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            取消
          </Button>
          <Button size="sm" variant="ghost" className="text-[#C44957]" onClick={remove}>
            <Trash2 className="size-3.5" />
            删除
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-[#C44957]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex ${isRight ? "justify-end" : isUnknown ? "justify-center" : "justify-start"}`}>
      <div
        className={`group flex max-w-[85%] items-start gap-2 sm:max-w-[75%] ${
          isRight ? "flex-row-reverse" : ""
        }`}
      >
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: avatarBg(message.senderRole), color: avatarColor(message.senderRole) }}
        >
          {avatarIcon(message.senderRole)}
        </div>
        <div
          className="relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            backgroundColor: isRight ? "#FCE7F0" : isUnknown ? "#FFF1F6" : "#FFF1F6",
            color: "#543C49",
            borderRadius: isRight ? "16px 16px 4px 16px" : isUnknown ? "16px" : "16px 16px 16px 4px",
            border: isUnknown ? "1px dashed #F0C8DC" : "none",
          }}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          <div
            className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]"
            style={{ color: "#94818D" }}
          >
            <span>#{message.sequence} · {ROLE_LABEL[message.senderRole]}</span>
            {message.timestamp && <span>{message.timestamp.slice(0, 16)}</span>}
            {message.manuallyCorrected && (
              <Badge className="text-[10px]" style={{ backgroundColor: "#FFF1F6", color: "#E65B93" }}>
                已修正
              </Badge>
            )}
          </div>
          {message.note && (
            <div
              className="mt-1.5 flex items-start gap-1 rounded px-1.5 py-1 text-[10px]"
              style={{ backgroundColor: "rgba(166, 106, 32, 0.08)", color: "#A66A20" }}
            >
              <TriangleAlert className="mt-0.5 size-3 shrink-0" />
              <span>{message.note}</span>
            </div>
          )}
          <button
            onClick={() => {
              setDraft({ role: message.senderRole, content: message.content });
              setEditing(true);
            }}
            aria-label="纠错"
            className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#F0C8DC",
              color: "#E65B93",
            }}
          >
            <Pencil className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConversationViewProps {
  conversation: ConversationData;
  onChanged: (conversation: ConversationData) => void;
  onReanalyze: () => void;
  reanalyzing?: boolean;
}

export function ConversationView({ conversation, onChanged, onReanalyze, reanalyzing }: ConversationViewProps) {
  const [copied, setCopied] = useState(false);
  const meta = conversation.recognitionMeta;
  const uncertainties = meta?.uncertainties ?? [];

  async function copyTranscript() {
    const text = conversation.messages
      .map((m) => `${ROLE_LABEL[m.senderRole]} ${m.timestamp?.slice(0, 16) ?? ""}\n${m.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("复制失败，请手动选择复制");
    }
  }

  function applyChange(updated: ConversationMessage) {
    onChanged({
      ...conversation,
      messages: conversation.messages.map((m) => (m.id === updated.id ? updated : m)),
    });
  }

  function applyDelete(messageId: string) {
    onChanged({
      ...conversation,
      messages: conversation.messages.filter((m) => m.id !== messageId),
    });
  }

  return (
    <div className="space-y-4">
      {/* 对话标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium" style={{ color: "#302436" }}>
              {conversation.title ?? "未命名对话"}
            </h3>
            <Badge
              variant="secondary"
              className="text-xs"
              style={{ backgroundColor: "#FCE7F0", color: "#C82E72" }}
            >
              {conversation.messages.length} 条消息
            </Badge>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "#94818D" }}>
            {conversation.screenshots.length} 张截图
            {meta?.model ? ` · 模型 ${meta.model}` : ""}
            {meta?.latencyMs != null ? ` · 耗时 ${(meta.latencyMs / 1000).toFixed(1)}s` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyTranscript}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "已复制" : "复制对话"}
          </Button>
          <Button size="sm" variant="outline" onClick={onReanalyze} disabled={reanalyzing}>
            <RefreshCw className={`size-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
            重新识别
          </Button>
        </div>
      </div>

      {uncertainties.length > 0 && (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertDescription>
            <span className="font-medium">识别提示：</span>
            {uncertainties.join("；")}
            <span className="block text-xs">
              您可以直接点击消息进行纠错，修正结果将保存并优先采用。
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* 聊天气泡区域 */}
      <div
        className="space-y-4 rounded-2xl p-4 sm:p-5"
        style={{ backgroundColor: "#FFFAFC", border: "1px solid #F5E0EC" }}
      >
        {conversation.messages.map((m) => (
          <div key={m.id} className="group">
            <MessageRow
              message={m}
              onSaved={applyChange}
              onDeleted={applyDelete}
            />
          </div>
        ))}
        {conversation.messages.length === 0 && (
          <p className="py-6 text-center text-sm" style={{ color: "#94818D" }}>
            该对话暂无消息，点击「重新识别」恢复
          </p>
        )}
      </div>

      <p className="text-xs" style={{ color: "#94818D" }}>
        提示：悬停消息可点击编辑按钮修改内容或调整发言方；人工修正后系统将保存并优先采用。
      </p>

      {/* AI 推荐回复 */}
      <ReplyPanel conversationId={conversation.id} />
    </div>
  );
}
