// /api/saved-replies —— 优秀话术收藏（POST）与列表查询（GET）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { collectSavedReply } from "@/services/saved-reply-service";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) throw new ApiError(400, "话术内容不能为空");
    if (content.length > 4000) throw new ApiError(400, "话术内容过长");

    // 校验关联资源归属
    let customerId: string | null = null;
    let conversationId: string | null = null;
    let replyGenerationId: string | null = null;

    if (body.generationId) {
      const gen = await prisma.replyGeneration.findFirst({
        where: { id: body.generationId, userId: user.id },
      });
      if (!gen) throw new ApiError(404, "关联的回复不存在");
      replyGenerationId = gen.id;
      conversationId = gen.conversationId;
      customerId = gen.customerId;
    }

    if (body.conversationId && !conversationId) {
      const conv = await prisma.conversation.findFirst({
        where: { id: body.conversationId, userId: user.id },
      });
      if (!conv) throw new ApiError(404, "关联的对话不存在");
      conversationId = conv.id;
      customerId = conv.customerId;
    }

    const saved = await collectSavedReply({
      userId: user.id,
      content,
      customerId,
      conversationId,
      replyGenerationId,
      customerContext: typeof body.customerContext === "string" ? body.customerContext : undefined,
    });

    return NextResponse.json({ ok: true, data: saved });
  });
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q");

    const list = await prisma.savedReply.findMany({
      where: {
        userId: user.id,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { content: { contains: q, mode: "insensitive" } },
                { questionType: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ ok: true, data: list });
  });
}
