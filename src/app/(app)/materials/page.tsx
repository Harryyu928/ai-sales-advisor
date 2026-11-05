// 常用销售资料页面
import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { MaterialsBoard } from "@/components/materials/materials-board";

export const metadata: Metadata = { title: "销售资料" };

export default function MaterialsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "#FCE7F0" }}
        >
          <FolderOpen className="size-5" style={{ color: "#E65B93" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "#302436" }}>
            销售资料
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
            集中管理常用话术与资料，一键复制，沟通时快速调用
          </p>
        </div>
      </div>

      <MaterialsBoard />
    </div>
  );
}
