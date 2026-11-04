// 截图文件校验与受保护存储
// 开发环境：本地私有目录（storage/screenshots，已 gitignore，不通过公开路由访问）
// 生产环境：替换为私有对象存储（见 README 部署说明）
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 单张 10MB
export const MAX_FILES_PER_UPLOAD = 10; // 单次最多 10 张

type ImageRule = { mime: string; ext: string; check: (buf: Buffer) => boolean };

// 魔数校验，防止伪造扩展名/类型
const IMAGE_RULES: ImageRule[] = [
  {
    mime: "image/jpeg",
    ext: ".jpg",
    check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: ".png",
    check: (b) =>
      b.length >= 8 &&
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    ext: ".webp",
    check: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** 受保护存储根目录 */
export function storageRoot(): string {
  return env.STORAGE_DIR || path.join(process.cwd(), "storage", "screenshots");
}

export interface SavedScreenshot {
  id: string;
  fileName: string;
  relativePath: string; // 相对存储根目录
  sizeBytes: number;
  mimeType: string;
}

/** 校验并保存单张截图，返回存储信息；不合法时抛出 ApiError */
export async function validateAndSaveScreenshot(
  userId: string,
  file: File
): Promise<SavedScreenshot> {
  if (file.size === 0) throw new ApiError(400, `文件为空：${file.name}`);
  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(413, `文件过大（超过 10MB）：${file.name}`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const rule = IMAGE_RULES.find((r) => r.mime === file.type);
  if (!rule) {
    throw new ApiError(415, `不支持的文件类型（仅支持 JPG/PNG/WebP）：${file.type || "未知"}`);
  }
  if (!rule.check(buf)) {
    throw new ApiError(415, `文件内容与声明类型不符：${file.name}`);
  }

  const id = randomUUID();
  const fileName = `${id}${rule.ext}`;
  const relativePath = path.join(userId, fileName);
  const dir = path.join(storageRoot(), userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buf);

  return { id, fileName, relativePath, sizeBytes: buf.length, mimeType: rule.mime };
}

/** 读取已保存的截图文件（相对路径需在存储根目录内，防止路径穿越） */
export async function readScreenshotFile(relativePath: string): Promise<Buffer> {
  const root = path.resolve(storageRoot());
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new ApiError(400, "非法的存储路径");
  }
  try {
    return await readFile(resolved);
  } catch {
    throw new ApiError(404, "截图文件不存在或已被清理");
  }
}
