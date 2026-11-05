"use client";

// 个人定制中心：数字身份编辑 + 四套主题切换，持久化到账号并跨设备同步
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, Palette, IdCard } from "lucide-react";
import { Monogram, deriveMonogram } from "@/components/layout/monogram";

const THEMES = [
  { id: "rose-champagne", name: "玫瑰香槟", desc: "柔粉 · 暖象牙白", colors: ["#B66D87", "#F3E3E4", "#FAF7F4", "#542F43"] },
  { id: "twilight-berry", name: "暮光莓酒", desc: "深莓红 · 香槟金", colors: ["#9E4B6E", "#EAD3DC", "#F7F2F0", "#3E1F30"] },
  { id: "moonlight-rose", name: "月光蔷薇", desc: "灰紫粉 · 冷白", colors: ["#9B7E9E", "#E7DEE7", "#F6F6F8", "#3E3244"] },
  { id: "peach-velvet", name: "蜜桃丝绒", desc: "蜜桃 · 暖白", colors: ["#D08E7E", "#F4DFD6", "#FBF6F1", "#5C3A34"] },
];

interface Props {
  defaultName: string;
}

export function PersonalizePanel({ defaultName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(defaultName);
  const [identity, setIdentity] = useState({
    nickname: "",
    englishName: "",
    monogram: "",
    title: "",
    bio: "",
    welcomeMessage: "",
    signature: "",
  });
  const [theme, setTheme] = useState("rose-champagne");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          if (res.data.user?.name) setName(res.data.user.name);
          if (res.data.identity) {
            const i = res.data.identity;
            setIdentity({
              nickname: i.nickname || "",
              englishName: i.englishName || "",
              monogram: i.monogram || "",
              title: i.title || "",
              bio: i.bio || "",
              welcomeMessage: i.welcomeMessage || "",
              signature: i.signature || "",
            });
          }
          if (res.data.theme?.theme) setTheme(res.data.theme.theme);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, theme: { theme } }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[20px] p-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
        加载个人定制…
      </div>
    );
  }

  const field =
    "w-full rounded-[12px] border px-3.5 py-2.5 text-sm outline-none focus:ring-2";
  const fieldStyle = {
    borderColor: "var(--border)",
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      {/* 身份预览卡 */}
      <div
        className="flex items-center gap-4 rounded-[20px] p-5"
        style={{
          background: "linear-gradient(135deg, var(--primary-light) 0%, var(--primary-soft) 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <Monogram name={name} custom={identity.monogram || null} size="xl" />
        <div className="min-w-0">
          <div className="text-lg font-semibold" style={{ color: "var(--primary-deep)", fontFamily: "var(--font-serif)" }}>
            {identity.nickname || name}
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {identity.title || "教育顾问"} · {identity.englishName ? `${identity.englishName} · ` : ""}My Advisor Studio
          </div>
        </div>
      </div>

      {/* 数字身份 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <IdCard className="size-4" style={{ color: "var(--primary)" }} />
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            我的数字身份
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--muted-foreground)" }}>中文昵称</span>
            <input className={field} style={fieldStyle} value={identity.nickname}
              onChange={(e) => setIdentity({ ...identity, nickname: e.target.value })}
              placeholder="如：小雅" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--muted-foreground)" }}>英文显示名</span>
            <input className={field} style={fieldStyle} value={identity.englishName}
              onChange={(e) => setIdentity({ ...identity, englishName: e.target.value })}
              placeholder="如：Ya" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--muted-foreground)" }}>专属字母组合（留空自动生成 {deriveMonogram(name)}）</span>
            <input className={field} style={fieldStyle} value={identity.monogram} maxLength={2}
              onChange={(e) => setIdentity({ ...identity, monogram: e.target.value.toUpperCase() })}
              placeholder="如：HY" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--muted-foreground)" }}>职业标签</span>
            <input className={field} style={fieldStyle} value={identity.title}
              onChange={(e) => setIdentity({ ...identity, title: e.target.value })}
              placeholder="如：语言规划顾问" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-xs" style={{ color: "var(--muted-foreground)" }}>专属欢迎语</span>
            <input className={field} style={fieldStyle} value={identity.welcomeMessage}
              onChange={(e) => setIdentity({ ...identity, welcomeMessage: e.target.value })}
              placeholder="如：你的专属 AI 顾问伙伴，已经准备好一起高效沟通。" />
          </label>
        </div>
      </section>

      {/* 主题选择 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Palette className="size-4" style={{ color: "var(--primary)" }} />
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            视觉主题
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="rounded-[16px] p-3 text-left transition-all"
                style={{
                  border: active ? "2px solid var(--primary)" : "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <div className="mb-2 flex gap-1.5">
                  {t.colors.map((c) => (
                    <span key={c} className="size-5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t.desc}</div>
                  </div>
                  {active && <Check className="size-4" style={{ color: "var(--primary)" }} />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 保存 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[12px] px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
        >
          {saving ? "保存中…" : "保存我的定制"}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: "var(--primary-deep)" }}>
            已保存，主题即时生效
          </span>
        )}
      </div>
    </div>
  );
}
