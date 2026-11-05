"use client";

// 粘贴文字识别：直接粘贴微信聊天记录，AI自动区分客户/顾问对话
import { useState } from "react";
import { ClipboardPaste, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParsedMessage {
  role: "CUSTOMER" | "ADVISOR" | "UNKNOWN";
  content: string;
}

interface PasteTextProps {
  onParsed: (conversationId: string, messages: ParsedMessage[]) => void;
}

export function PasteText({ onParsed }: PasteTextProps) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!text.trim() || parsing) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/screenshots/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "解析失败");
        return;
      }
      onParsed(json.data.conversationId, json.data.messages);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div
      className="rounded-[18px] p-5"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex size-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: "var(--primary-light)" }}
        >
          <ClipboardPaste className="size-4" style={{ color: "var(--primary)" }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          粘贴聊天记录
        </h3>
        <span className="text-xs" style={{ color: "#94818D" }}>
          直接复制微信文字，自动识别对话双方
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="粘贴微信聊天记录，例如：&#10;&#10;客户：你好，我想问一下雅思怎么报名？&#10;顾问：你好！雅思机考和纸笔都可以……&#10;客户：好的，我目标6.5分……"
        rows={6}
        className="w-full rounded-[12px] p-4 text-sm leading-relaxed outline-none resize-none"
        style={{ backgroundColor: "#FFFAFC", border: "1px solid var(--gold)", color: "var(--foreground)" }}
      />

      {error && (
        <div className="mt-2 text-xs" style={{ color: "#DC2626" }}>
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={handleParse} disabled={parsing || !text.trim()} className="min-w-32">
          {parsing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              解析中…
            </>
          ) : (
            <>
              <ArrowRight className="size-4" />
              开始解析
            </>
          )}
        </Button>
        <span className="text-xs" style={{ color: "#94818D" }}>
          AI自动识别客户/顾问发言
        </span>
      </div>
    </div>
  );
}
