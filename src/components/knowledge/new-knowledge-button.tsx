"use client";

// 新建知识按钮 + 弹窗（独立客户端组件）
import { useState } from "react";
import { Plus } from "lucide-react";
import { KnowledgeForm } from "./knowledge-form";

export function NewKnowledgeButton({ onSaved }: { onSaved?: () => void }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #E65B93 0%, #C82E72 100%)" }}
      >
        <Plus className="size-4" />
        新建知识
      </button>

      {showForm && (
        <KnowledgeForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onSaved?.();
          }}
        />
      )}
    </>
  );
}
