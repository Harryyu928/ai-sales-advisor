"use client";

// 私人工作台快捷模块：真实计数 + 可配置显隐（持久化到账号）
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Star,
  FolderOpen,
  GraduationCap,
  Users,
  ArrowRight,
  Settings2,
  Check,
  type LucideIcon,
} from "lucide-react";

interface ModuleDef {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  statKey: "dueCount" | "savedReplies" | "materials" | "studyPlans" | "conversations";
}

const MODULES: ModuleDef[] = [
  { key: "due", label: "今日待办", desc: "到期跟进", href: "/follow-ups", icon: BellRing, statKey: "dueCount" },
  { key: "replies", label: "话术收藏", desc: "我的经典回复", href: "/style", icon: Star, statKey: "savedReplies" },
  { key: "materials", label: "常用资料", desc: "一键调用", href: "/materials", icon: FolderOpen, statKey: "materials" },
  { key: "study", label: "备考方案", desc: "已生成规划", href: "/study-plans", icon: GraduationCap, statKey: "studyPlans" },
  { key: "customers", label: "客户对话", desc: "咨询记录", href: "/customers", icon: Users, statKey: "conversations" },
];

const DEFAULTS: Record<string, boolean> = Object.fromEntries(MODULES.map((m) => [m.key, true]));

export function WorkspaceShortcuts() {
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>(DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/workspace-stats")
      .then((r) => r.json())
      .then((res) => res.ok && res.data && setStats(res.data))
      .catch(() => {});
    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data?.theme?.workspaceModules) {
          setVisible({ ...DEFAULTS, ...res.data.theme.workspaceModules });
        }
      })
      .catch(() => {});
  }, []);

  const shown = MODULES.filter((m) => (editing ? true : visible[m.key] !== false));

  function toggle(key: string) {
    setDirty((d) => {
      const base = d ?? visible;
      return { ...base, [key]: !(base[key] !== false) };
    });
  }

  async function saveLayout() {
    const next = dirty ?? visible;
    setVisible(next);
    setEditing(false);
    setDirty(null);
    setSaved(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: { workspaceModules: next } }),
    }).catch(() => {});
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  const active = dirty ?? visible;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          我的快捷空间
        </h3>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs" style={{ color: "var(--primary-deep)" }}>已保存</span>}
          {editing ? (
            <button
              onClick={saveLayout}
              className="rounded-[10px] px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
            >
              完成
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs"
              style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", backgroundColor: "var(--card)" }}
            >
              <Settings2 className="size-3.5" /> 编辑工作台
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {shown.map((m) => {
          const on = active[m.key] !== false;
          const Icon = m.icon;
          const card = (
            <div
              className="card-lift relative flex flex-col justify-between rounded-[16px] p-4 h-full cursor-pointer"
              style={{
                backgroundColor: "var(--card)",
                border: editing ? (on ? "1.5px solid var(--primary)" : "1px solid var(--border)") : "1px solid var(--border)",
                opacity: editing && !on ? 0.5 : 1,
              }}
              onClick={() => {
                if (editing) toggle(m.key);
                else router.push(m.href);
              }}
            >
              {editing && (
                <span
                  className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: on ? "var(--primary)" : "var(--card)",
                    border: on ? "none" : "1.5px solid var(--border)",
                    color: "#fff",
                  }}
                >
                  {on && <Check className="size-3" />}
                </span>
              )}
              <div
                className="flex size-9 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: "var(--primary-light)", color: "var(--primary-deep)" }}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-semibold" style={{ color: "var(--primary-deep)", fontFamily: "var(--font-serif)" }}>
                  {stats[m.statKey] ?? "—"}
                </div>
                <div className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{m.label}</div>
                <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{m.desc}</div>
              </div>
              {!editing && <ArrowRight className="absolute right-3 top-3 size-3.5" style={{ color: "var(--muted-foreground)" }} />}
            </div>
          );
          return card;
        })}
      </div>
    </section>
  );
}
