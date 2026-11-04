// 客户记录页面 V4.0：轻奢柔雾粉设计
import type { Metadata } from "next";
import { Users, Search, UserPlus, MessageCircle, Clock, Target } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "客户记录" };

const STAGE_COLORS: Record<string, string> = {
  "初次咨询": "#5B8FD6",
  "需求确认": "#E65B93",
  "方案讨论": "#2D9B7E",
  "价格敏感": "#C47A20",
  "即将签约": "#8B5CF6",
  "售后跟进": "#796D77",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireUser();
  const { search } = await searchParams;

  const where: Record<string, unknown> = { userId: user.id };
  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { code: { contains: q } },
      { targetExam: { contains: q } },
      { salesStage: { contains: q } },
      { summary: { contains: q } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "#FCE7F0" }}
        >
          <Users className="size-5" style={{ color: "#E65B93" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "#302436" }}>
            客户记录
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#817786" }}>
            自动从聊天中提取客户信息，建立独立客户档案与沟通记忆
          </p>
        </div>
      </div>

      {/* 搜索区 */}
      <form
        action="/customers"
        className="relative rounded-[16px] bg-white"
        style={{ border: "1px solid #F0C8DC", boxShadow: "0 2px 12px rgba(230,91,147,0.06)" }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5" style={{ color: "#94818D" }} />
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="搜索客户代号、目标考试或咨询阶段……"
          className="w-full rounded-[16px] py-3.5 pl-11 pr-4 text-sm outline-none"
          style={{ backgroundColor: "transparent", color: "#302436" }}
        />
      </form>

      {customers.length === 0 ? (
        <div
          className="card-lift flex flex-col items-center gap-3 rounded-[20px] bg-white py-16 text-center"
          style={{ border: "1px solid #F5E0EC" }}
        >
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "#FCE7F0" }}
          >
            <Users className="size-7" style={{ color: "#E65B93" }} />
          </div>
          <div className="text-sm font-medium" style={{ color: "#302436" }}>
            还没有客户记录
          </div>
          <div className="max-w-sm text-xs" style={{ color: "#817786" }}>
            上传微信聊天截图后，系统将自动为每次咨询建立客户档案、识别咨询阶段并记住客户关键信息
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 统计条 */}
          <div className="flex items-center gap-2 text-sm" style={{ color: "#817786" }}>
            <span className="font-medium" style={{ color: "#302436" }}>{customers.length}</span>
            位客户
            {search && (
              <span>
                （搜索「{search}」<Link href="/customers" className="underline" style={{ color: "#E65B93" }}>清除</Link>）
              </span>
            )}
          </div>

          {/* 客户卡片列表 */}
          {customers.map((c) => {
            const stageColor = STAGE_COLORS[c.salesStage ?? ""] || "#817786";
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="card-lift block rounded-[16px] bg-white p-4 md:p-5"
                style={{ border: "1px solid #F5E0EC" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ background: "linear-gradient(135deg, #FCE7F0 0%, #FFF1F6 100%)", color: "#E65B93" }}
                    >
                      {c.code?.slice(0, 1) || "客"}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "#302436" }}>
                        {c.code}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {c.targetExam && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
                            style={{ backgroundColor: "#FFF1F6", color: "#C82E72" }}
                          >
                            <Target className="size-3" />
                            {c.targetExam}
                          </span>
                        )}
                        {c.salesStage && (
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: "#FCE7F0", color: stageColor }}
                          >
                            {c.salesStage}
                          </span>
                        )}
                        {c.targetScore && (
                          <span className="text-xs" style={{ color: "#817786" }}>
                            目标 {c.targetScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: "#94818D" }}>
                    <Clock className="size-3" />
                    {c.lastContactAt?.toLocaleDateString("zh-CN") ?? "未记录"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
