// /api/materials/[id] —— 资料详情（GET）、更新（PATCH）、收藏切换（POST）、删除（DELETE）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  updateMaterial,
  deleteMaterial,
  toggleFavorite,
  MATERIAL_TYPES,
  type MaterialType,
} from "@/services/sales-material-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;
    const material = await prisma.salesMaterial.findFirst({
      where: { id, userId: user.id },
    });
    if (!material) throw new ApiError(404, "资料不存在");
    return NextResponse.json({ ok: true, data: material });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const patch: Parameters<typeof updateMaterial>[2] = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string") throw new ApiError(400, "标题格式不正确");
      patch.title = body.title;
    }

    if (body.materialType !== undefined) {
      if (!MATERIAL_TYPES.includes(body.materialType)) {
        throw new ApiError(400, "无效的资料类型");
      }
      patch.materialType = body.materialType as MaterialType;
    }

    if (body.content !== undefined) {
      if (body.content !== null && typeof body.content !== "string") {
        throw new ApiError(400, "文字内容格式不正确");
      }
      patch.content = body.content;
    }

    if (body.fileUrl !== undefined) {
      if (body.fileUrl !== null && typeof body.fileUrl !== "string") {
        throw new ApiError(400, "链接格式不正确");
      }
      patch.fileUrl = body.fileUrl;
    }

    if (body.favorite !== undefined) {
      if (typeof body.favorite !== "boolean") throw new ApiError(400, "收藏标记格式不正确");
      patch.favorite = body.favorite;
    }

    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.status !== undefined) patch.status = body.status;

    const material = await updateMaterial(user.id, id, patch);
    return NextResponse.json({ ok: true, data: material });
  });
}

// 收藏切换（POST /api/materials/[id]）
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;
    const material = await toggleFavorite(user.id, id);
    return NextResponse.json({ ok: true, data: material });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");
    const { id } = await params;
    const result = await deleteMaterial(user.id, id);
    return NextResponse.json({ ok: true, data: result });
  });
}
