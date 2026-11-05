// 话术资产馆 V6.1：私人档案馆风格，真实话术沉淀
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RepliesArchive } from "@/components/saved-replies/replies-archive";

export const metadata: Metadata = { title: "话术资产馆" };

export default async function SavedRepliesPage() {
  const user = await requireUser();
  const replies = await prisma.savedReply.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      customerContext: true,
      stage: true,
      customerConcern: true,
      questionType: true,
      status: true,
      favorite: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-[28px]" style={{ color: "var(--primary-deep)", fontFamily: "var(--font-serif)" }}>
          我的话术资产馆
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          多年真实沟通的沉淀，按场景检索、一键复用
        </p>
      </div>
      <RepliesArchive
        initial={replies.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
