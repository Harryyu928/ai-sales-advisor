// 语言备考路径页面
import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { StudyPlanBoard } from "@/components/studyplan/study-plan-board";

export const metadata: Metadata = { title: "备考路径" };

export default function StudyPlansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "#FCE7F0" }}
        >
          <GraduationCap className="size-5" style={{ color: "#E65B93" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "#302436" }}>
            语言备考路径
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
            结合客户基础快速生成可执行备考路径，一键生成微信沟通版
          </p>
        </div>
      </div>

      <StudyPlanBoard />
    </div>
  );
}
