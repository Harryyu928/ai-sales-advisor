// AI 智能回复主页面 V6.1：私人工作室欢迎区 + 快捷模块 + 核心回复工作流
import type { Metadata } from "next";
import { AnalyzeWorkflow } from "@/components/home/analyze-workflow";
import { WelcomeHeader } from "@/components/home/welcome-header";
import { WorkspaceShortcuts } from "@/components/home/workspace-shortcuts";

export const metadata: Metadata = { title: "AI 智能回复" };

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* 私人工作室欢迎区 */}
      <WelcomeHeader />

      {/* 我的快捷空间（可配置显隐） */}
      <WorkspaceShortcuts />

      {/* 核心工作流 */}
      <AnalyzeWorkflow />
    </div>
  );
}
