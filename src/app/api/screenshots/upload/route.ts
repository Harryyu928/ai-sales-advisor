// 截图上传：文件校验（类型/大小/数量/魔数）→ 受保护存储 → 数据库登记
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handle, ok, ApiError } from "@/lib/api";
import { validateAndSaveScreenshot, MAX_FILES_PER_UPLOAD } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();

    const form = await req.formData().catch(() => null);
    if (!form) throw new ApiError(400, "请求格式不正确或请求体过大（需要 multipart/form-data）");

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) throw new ApiError(400, "未收到图片文件");
    if (files.length > MAX_FILES_PER_UPLOAD) {
      throw new ApiError(400, `单次最多上传 ${MAX_FILES_PER_UPLOAD} 张截图`);
    }

    const assets: unknown[] = [];
    for (const file of files) {
      const info = await validateAndSaveScreenshot(user.id, file);
      const asset = await prisma.screenshotAsset.create({
        data: {
          userId: user.id,
          originalName: file.name,
          mimeType: info.mimeType,
          sizeBytes: info.sizeBytes,
          storagePath: info.relativePath,
          status: "UPLOADED",
        },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          createdAt: true,
        },
      });
      assets.push(asset);
    }

    await audit(user.id, "UPLOAD_SCREENSHOTS", {
      entityType: "ScreenshotAsset",
      detail: { count: assets.length },
    });

    return ok({ count: assets.length, assets }, 201);
  });
}
