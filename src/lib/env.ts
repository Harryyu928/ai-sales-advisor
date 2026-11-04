// 环境变量校验：所有配置集中在此，模型名称/密钥不硬编码
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL 未配置"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET 至少 16 个字符"),
  // 火山方舟豆包大模型（第二、三阶段接入）
  ARK_API_KEY: z.string().optional(),
  ARK_BASE_URL: z.string().url().optional(),
  ARK_TEXT_MODEL: z.string().optional(),
  ARK_VISION_MODEL: z.string().optional(),
  ARK_EMBEDDING_MODEL: z.string().optional(),
  // 开发专用：模拟识别模式（=true 时不调用真实模型，返回标注为 mock-vision-fixture 的结果，
  // 仅用于在未配置 API Key 时验证上传→识别→展示→纠错全流程；配置真实 Key 后必须移除）
  ARK_MOCK_VISION: z.string().optional(),
  // 受保护文件存储目录（默认：项目根目录/storage/screenshots）
  STORAGE_DIR: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    "环境变量校验失败: " +
      parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")
  );
}

export const env = parsed.data;

/** AI 接口是否已配置完整（未配置时前端应提示） */
export const aiConfigured = Boolean(
  env.ARK_API_KEY && env.ARK_TEXT_MODEL && env.ARK_VISION_MODEL
);
