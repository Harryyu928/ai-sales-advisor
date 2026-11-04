// GET /api/knowledge —— 知识列表；POST /api/knowledge —— 新增知识
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.reviewStatus = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { examType: { contains: search, mode: "insensitive" } },
      ];
    }

    const docs = await prisma.knowledgeDocument.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        category: true,
        examType: true,
        reviewStatus: true,
        sourceType: true,
        sourceUrl: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: docs });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json();
    const { title, category, content, examType, sourceType, sourceUrl, tags } = body;

    if (!title || !category || !content) {
      throw new ApiError(400, "标题、分类和内容不能为空");
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        title,
        category,
        content,
        examType: examType || null,
        sourceType: sourceType || "manual",
        sourceUrl: sourceUrl || null,
        tags: tags || undefined,
        reviewStatus: "APPROVED", // 手动新增默认审核通过
        uploadedById: user.id,
      },
    });

    return NextResponse.json({ ok: true, data: { id: doc.id } });
  });
}
