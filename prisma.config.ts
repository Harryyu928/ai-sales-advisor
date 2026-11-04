// Prisma 7 配置：Migrate 通过 datasource.url 直连数据库
// 说明：Prisma 7 CLI 不会自动加载 .env，这里显式加载，保证 DATABASE_URL 可用
import { defineConfig } from "prisma/config";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {
  // .env 不存在时忽略（部署环境直接注入环境变量）
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
