// 常用销售资料服务（功能7）
// 职责：销售资料的 CRUD、收藏置顶、分类/关键词检索；供顾问一键复制常用话术与资料
// 规则：写操作校验 userId 归属；tags 统一为字符串数组；不破坏受保护文件
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { toPlainJson } from "@/lib/utils";

export const MATERIAL_TYPES = [
  "COURSE_INTRO",
  "PRICE_LIST",
  "ONE_ON_ONE",
  "GROUP_CLASS",
  "ASSESSMENT",
  "TRIAL",
  "SERVICE_SCOPE",
  "FAQ",
  "ADVANTAGE",
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  COURSE_INTRO: "课程介绍",
  PRICE_LIST: "价格表",
  ONE_ON_ONE: "一对一",
  GROUP_CLASS: "班课",
  ASSESSMENT: "测评",
  TRIAL: "试听",
  SERVICE_SCOPE: "服务范围",
  FAQ: "常见问题",
  ADVANTAGE: "机构优势",
};

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean)
    .slice(0, 10);
}

export interface CreateMaterialInput {
  title: string;
  materialType: MaterialType;
  content?: string | null;
  fileUrl?: string | null;
  favorite?: boolean;
  tags?: unknown;
  status?: string;
}

/** 新建销售资料 */
export async function createMaterial(userId: string, input: CreateMaterialInput) {
  const title = input.title?.trim();
  if (!title) throw new ApiError(400, "资料标题不能为空");
  if (title.length > 200) throw new ApiError(400, "资料标题过长");
  if (!MATERIAL_TYPES.includes(input.materialType)) {
    throw new ApiError(400, "无效的资料类型");
  }

  const content = input.content?.trim() || null;
  const fileUrl = input.fileUrl?.trim() || null;
  if (!content && !fileUrl) {
    throw new ApiError(400, "请至少填写可复制文字或文件链接");
  }

  return prisma.salesMaterial.create({
    data: {
      userId,
      title,
      materialType: input.materialType,
      content,
      fileUrl,
      favorite: input.favorite ?? false,
      tags: toPlainJson(normalizeTags(input.tags)),
      status: input.status === "PENDING" ? "PENDING" : "APPROVED",
    },
  });
}

export interface ListMaterialsOptions {
  materialType?: MaterialType;
  favorite?: boolean;
  q?: string;
  status?: string;
}

/** 查询资料列表：收藏优先，再按更新时间倒序 */
export async function listMaterials(userId: string, opts: ListMaterialsOptions = {}) {
  const where: Record<string, unknown> = { userId };
  if (opts.materialType) where.materialType = opts.materialType;
  if (opts.favorite) where.favorite = true;
  if (opts.status) where.status = opts.status;

  if (opts.q?.trim()) {
    const q = opts.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  const list = await prisma.salesMaterial.findMany({
    where,
    take: 200,
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  });
  return list;
}

/** 校验归属并返回资料 */
async function getOwnedMaterial(userId: string, id: string) {
  const material = await prisma.salesMaterial.findFirst({ where: { id, userId } });
  if (!material) throw new ApiError(404, "资料不存在或无权限");
  return material;
}

export interface UpdateMaterialInput {
  title?: string;
  materialType?: MaterialType;
  content?: string | null;
  fileUrl?: string | null;
  favorite?: boolean;
  tags?: unknown;
  status?: string;
}

/** 更新资料 */
export async function updateMaterial(userId: string, id: string, patch: UpdateMaterialInput) {
  await getOwnedMaterial(userId, id);
  const data: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new ApiError(400, "资料标题不能为空");
    data.title = title;
  }

  if (patch.materialType !== undefined) {
    if (!MATERIAL_TYPES.includes(patch.materialType)) {
      throw new ApiError(400, "无效的资料类型");
    }
    data.materialType = patch.materialType;
  }

  if (patch.content !== undefined) data.content = patch.content?.trim() || null;
  if (patch.fileUrl !== undefined) data.fileUrl = patch.fileUrl?.trim() || null;
  if (patch.favorite !== undefined) data.favorite = patch.favorite;
  if (patch.tags !== undefined) data.tags = toPlainJson(normalizeTags(patch.tags));
  if (patch.status !== undefined) {
    data.status = patch.status === "PENDING" ? "PENDING" : "APPROVED";
  }

  return prisma.salesMaterial.update({ where: { id }, data });
}

/** 切换收藏置顶 */
export async function toggleFavorite(userId: string, id: string) {
  const existing = await getOwnedMaterial(userId, id);
  return prisma.salesMaterial.update({
    where: { id },
    data: { favorite: !existing.favorite },
  });
}

/** 删除资料 */
export async function deleteMaterial(userId: string, id: string) {
  await getOwnedMaterial(userId, id);
  await prisma.salesMaterial.delete({ where: { id } });
  return { deleted: id };
}
