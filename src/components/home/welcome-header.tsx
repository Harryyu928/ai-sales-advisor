"use client";

// 私人工作室欢迎区：按本地时间问候 + 个人标识 + 专属欢迎语 + 风格标签
import { useEffect, useState } from "react";
import { Monogram } from "@/components/layout/monogram";

interface Profile {
  user?: { name?: string };
  identity?: {
    nickname?: string | null;
    monogram?: string | null;
    title?: string | null;
    welcomeMessage?: string | null;
  } | null;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export function WelcomeHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => res.ok && res.data && setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const name = profile?.identity?.nickname || profile?.user?.name || "顾问";
  const welcome =
    profile?.identity?.welcomeMessage ||
    "你的专属 AI 顾问伙伴，已经准备好一起高效沟通。";

  return (
    <section
      className="relative overflow-hidden rounded-[24px] p-6 md:p-8"
      style={{
        background:
          "linear-gradient(120deg, var(--primary-light) 0%, var(--primary-soft) 55%, var(--background) 100%)",
        border: "1px solid var(--border)",
      }}
    >
      {/* 装饰：抽象花瓣曲线（香槟金细线） */}
      <svg
        viewBox="0 0 400 120"
        className="pointer-events-none absolute -right-6 -top-8 opacity-40"
        style={{ width: 260, height: 120 }}
        preserveAspectRatio="none"
      >
        <path d="M0,90 C80,30 160,110 240,50 S360,20 400,60" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
        <path d="M0,105 C90,55 180,125 260,75 S370,45 400,85" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.6" />
      </svg>

      <div className="relative flex items-start gap-4 md:items-center">
        <Monogram name={profile?.user?.name || ""} custom={profile?.identity?.monogram || null} size="xl" />
        <div className="min-w-0">
          <h1
            className="text-xl font-semibold md:text-2xl"
            style={{ color: "var(--primary-deep)", fontFamily: "var(--font-serif)" }}
          >
            {greeting()}，{name}。
          </h1>
          <p className="mt-1 text-sm md:text-[15px]" style={{ color: "var(--muted-foreground)" }}>
            {welcome}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["自然亲切", "专业清晰", "温和引导"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--primary-deep)",
                  border: "1px solid var(--border)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      {!loaded && null}
    </section>
  );
}
