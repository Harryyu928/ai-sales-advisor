// 跟进提醒页面
import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { FollowUpBoard } from "@/components/followup/follow-up-board";

export const metadata: Metadata = { title: "跟进提醒" };

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "var(--primary-light)" }}
        >
          <BellRing className="size-5" style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "var(--foreground)" }}>
            跟进提醒
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
            自动从对话中提取待办，到期提醒，避免遗漏对客户的承诺
          </p>
        </div>
      </div>

      <FollowUpBoard />
    </div>
  );
}
