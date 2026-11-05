// 客户详情页 V4.0：轻奢柔雾粉设计
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ArrowLeft, Target, Clock, MessageCircle, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { DisputePanel } from "@/components/customers/dispute-panel";

export const metadata: Metadata = { title: "客户详情" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, userId: user.id },
    include: {
      conversations: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          messages: { orderBy: { sequence: "asc" }, take: 20 },
        },
      },
    },
  });

  if (!customer) notFound();

  const infoLabels: [string, string | null | undefined][] = [
    ["申请阶段", customer.applicationStage],
    ["销售阶段", customer.salesStage],
    ["目标国家", customer.targetCountry],
    ["目标院校", customer.targetSchool],
    ["目标专业", customer.targetMajor],
    ["目标考试", customer.targetExam],
    ["目标分数", customer.targetScore],
    ["当前水平", customer.currentLevel],
    ["预算范围", customer.budgetRange],
    ["主要顾虑", customer.concerns],
  ];

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm"
        style={{ color: "#817786" }}
      >
        <ArrowLeft className="size-4" />
        返回客户列表
      </Link>

      {/* 客户头部卡片 */}
      <div
        className="rounded-[20px] bg-white p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            style={{ background: "linear-gradient(135deg, #FCE7F0 0%, #FFF1F6 100%)", color: "#E65B93" }}
          >
            {customer.code?.slice(0, 1) || "客"}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#302436" }}>
              {customer.code}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#817786" }}>
              最近沟通：{customer.lastContactAt?.toLocaleDateString("zh-CN") ?? "未记录"}
            </p>
            {customer.summary && (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#302436" }}>
                {customer.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 待确认信息（有矛盾时才显示） */}
      <DisputePanel customerId={customer.id} />

      {/* 客户信息卡片 */}
      <div
        className="rounded-[20px] bg-white p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "#302436" }}>
          <Target className="size-4" style={{ color: "#E65B93" }} />
          客户关键信息
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {infoLabels.map(([label, value]) => (
            <div
              key={label}
              className="rounded-[12px] p-3"
              style={{ backgroundColor: "#FFFAFC" }}
            >
              <div className="text-xs" style={{ color: "#94818D" }}>{label}</div>
              <div className="mt-1 text-sm font-medium" style={{ color: "#302436" }}>
                {value || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 沟通记录 */}
      <div
        className="rounded-[20px] bg-white p-6"
        style={{ border: "1px solid #F5E0EC" }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "#302436" }}>
          <MessageCircle className="size-4" style={{ color: "#E65B93" }} />
          沟通记录（{customer.conversations.length}）
        </h2>
        {customer.conversations.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: "#94818D" }}>
            暂无沟通记录
          </div>
        ) : (
          <div className="space-y-4">
            {customer.conversations.map((conv) => (
              <div
                key={conv.id}
                className="rounded-[12px] p-4"
                style={{ backgroundColor: "#FFFAFC" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs" style={{ color: "#94818D" }}>
                    {conv.createdAt.toLocaleDateString("zh-CN")} · {conv.messages.length}条消息
                  </div>
                </div>
                <div className="space-y-1.5">
                  {conv.messages.slice(0, 5).map((msg, i) => (
                    <div
                      key={i}
                      className="text-xs leading-relaxed"
                      style={{ color: "#302436" }}
                    >
                      <span
                        className="mr-1.5 font-medium"
                        style={{ color: msg.senderRole === "CUSTOMER" ? "#E65B93" : "#817786" }}
                      >
                        {msg.senderRole === "CUSTOMER" ? "客户" : "顾问"}：
                      </span>
                      {msg.content?.slice(0, 80) ?? ""}
                      {(msg.content?.length ?? 0) > 80 && "…"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
