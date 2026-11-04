// 截图列表：当前用户的截图资产（按时间倒序）
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const assets = await prisma.screenshotAsset.findMany({
      where: { userId: user.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        conversationId: true,
        createdAt: true,
      },
    });
    return ok({ count: assets.length, assets });
  });
}
