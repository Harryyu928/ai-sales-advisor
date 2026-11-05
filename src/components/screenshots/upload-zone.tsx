"use client";

// 截图上传组件：拖拽 / 点击选择 / 剪贴板粘贴 → 排序 → 上传到受保护存储
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, X, Loader2, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

export interface UploadedAsset {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

interface UploadZoneProps {
  /** 上传成功后回调：新上传的资产（按上传顺序）+ 对应的预览图 URL */
  onUploaded?: (assets: UploadedAsset[], previews: string[]) => void;
}

/** 客户端压缩：超过 1.5MB 的截图缩放至最长边 2048px 并转 JPEG（保证文字清晰） */
async function compressImage(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp)$/i, ".jpg"), {
      type: "image/jpeg",
    });
  } catch {
    return file; // 压缩失败时原样上传，由服务端校验兜底
  }
}

export function UploadZone({ onUploaded }: UploadZoneProps) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setPending((prev) => {
      const next = [
        ...prev,
        ...list.map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          preview: URL.createObjectURL(f),
        })),
      ];
      return next.slice(0, 10); // 单次最多 10 张
    });
  }, []);

  // 电脑端 Ctrl+V / Command+V 粘贴截图
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  /** 调整待上传截图的顺序（第 1 张 = 最早截图，识别时按此顺序重建对话） */
  function movePending(index: number, dir: -1 | 1) {
    setPending((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleUpload() {
    if (pending.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    try {
      // 超大的截图先压缩再上传
      const files: File[] = [];
      for (const p of pending) {
        files.push(await compressImage(p.file));
      }
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/screenshots/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "上传失败，请重试");
        return;
      }
      setUploaded((prev) => [...prev, ...json.data.assets]);
      const previews = pending.map((p) => p.preview);
      onUploaded?.(json.data.assets, previews);
      setPending([]);
    } catch {
      setError("网络错误，请检查网络后重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 拖拽 / 点击区域 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors`}
        style={{
          backgroundColor: dragging ? "var(--primary-light)" : "#FFFAFC",
          borderColor: dragging ? "var(--primary)" : "var(--gold)",
        }}
      >
        <div
          className="flex size-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
        >
          <ImagePlus className="size-6" />
        </div>
        <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          上传微信聊天截图
        </div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          支持多张截图、拖拽或粘贴上传（Ctrl+V / Command+V）
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* 待上传预览 */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">
            待上传（{pending.length}/10）
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {pending.map((p, i) => (
              <div key={p.id} className="group relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.preview}
                  alt={`截图 ${i + 1}`}
                  className="aspect-[3/4] w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {i + 1}
                </span>
                <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                  <button
                    onClick={() => movePending(i, -1)}
                    disabled={i === 0}
                    aria-label="前移"
                    className="flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    onClick={() => movePending(i, 1)}
                    disabled={i === pending.length - 1}
                    aria-label="后移"
                    className="flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
                <button
                  onClick={() => removePending(p.id)}
                  aria-label="移除"
                  className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            可通过上/下箭头调整截图顺序：第 1 张为时间最早的一张，识别时按此顺序重建对话
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  上传中…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  上传截图
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPending([])}
              disabled={uploading}
            >
              清空
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 上传结果 */}
      {uploaded.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="size-4" />
            已安全保存 {uploaded.length} 张截图
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {uploaded.map((a) => (
              <li key={a.id} className="flex justify-between gap-4">
                <span className="truncate">{a.originalName}</span>
                <span className="shrink-0">
                  {a.mimeType.replace("image/", "").toUpperCase()} ·{" "}
                  {(a.sizeBytes / 1024).toFixed(1)}KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
