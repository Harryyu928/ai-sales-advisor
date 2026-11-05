// AI 回复效果分析页面
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { EffectAnalysisBoard } from "@/components/effect/effect-analysis-board";

export const metadata: Metadata = { title: "效果分析" };

export default function EffectAnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "#FCE7F0" }}
        >
          <BarChart3 className="size-5" style={{ color: "#E65B93" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "#302436" }}>
            AI 回复效果分析
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
            基于真实生成、质检、收藏、发送与效果数据，看清表现并获得改进建议
          </p>
        </div>
      </div>

      <EffectAnalysisBoard />
    </div>
  );
}
