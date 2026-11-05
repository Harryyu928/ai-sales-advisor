// /api/materials —— 销售资料列表（GET）与新建（POST）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import {
  createMaterial,
  listMaterials,
  MATERIAL_TYPES,
  type MaterialType,
} from "@/services/sales-material-service";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const url = new URL(req.url);
    const typeParam = url.searchParams.get("materialType");
    const favorite = url.searchParams.get("favorite") === "1";
    const q = url.searchParams.get("q");
    const status = url.searchParams.get("status");

    const materialType =
      typeParam && MATERIAL_TYPES.includes(typeParam as MaterialType)
        ? (typeParam as MaterialType)
        : undefined;

    const materials = await listMaterials(user.id, {
      materialType,
      favorite,
      q: q ?? undefined,
      status: status ?? undefined,
    });
    return NextResponse.json({ ok: true, data: materials });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title : "";
    const materialType = body.materialType;
    if (!materialType || !MATERIAL_TYPES.includes(materialType)) {
      throw new ApiError(400, "请选择有效的资料类型");
    }

    const material = await createMaterial(user.id, {
      title,
      materialType,
      content: typeof body.content === "string" ? body.content : null,
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : null,
      favorite: body.favorite === true,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    });

    return NextResponse.json({ ok: true, data: material }, { status: 201 });
  });
}
