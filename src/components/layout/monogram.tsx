import { cn } from "@/lib/utils";

// 从姓名推导字母组合：中文名取前两字，英文名取词首字母
export function deriveMonogram(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "AI";
  if (/[一-龥]/.test(trimmed)) return trimmed.slice(0, 2);
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

interface MonogramProps {
  name: string;
  custom?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// 私人字母徽章：衬线字形 + 香槟金细边，应用于侧边栏/身份卡/欢迎区
export function Monogram({ name, custom, size = "md", className }: MonogramProps) {
  const text = (custom || deriveMonogram(name)).toUpperCase().slice(0, 2);
  const dims = {
    sm: "size-8 text-[11px]",
    md: "size-10 text-[14px]",
    lg: "size-12 text-[17px]",
    xl: "size-16 text-[24px]",
  }[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold tracking-wide",
        "ring-1",
        dims,
        className
      )}
      style={{
        background: "linear-gradient(135deg, var(--primary-light) 0%, var(--primary-soft) 100%)",
        color: "var(--primary-deep)",
        fontFamily: "var(--font-serif)",
        boxShadow: "inset 0 0 0 1px var(--gold)",
      }}
      aria-label={`个人标识 ${text}`}
    >
      {text}
    </div>
  );
}
