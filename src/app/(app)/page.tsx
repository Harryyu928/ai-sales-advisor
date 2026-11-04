// AI 智能回复主页面
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { AnalyzeWorkflow } from "@/components/home/analyze-workflow";

export const metadata: Metadata = { title: "AI 智能回复" };

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-[12px]"
            style={{ backgroundColor: "#FCE7F0" }}
          >
            <Sparkles className="size-5" style={{ color: "#E65B93" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-semibold md:text-[28px]"
              style={{ color: "#302436" }}
            >
              AI 智能回复
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
              上传微信聊天截图，生成更符合你个人风格的专业回复
            </p>
          </div>
        </div>
      </div>

      {/* 主工作流 */}
      <AnalyzeWorkflow />
    </div>
  );
}
