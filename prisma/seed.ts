// 数据库初始化种子：创建管理员账号（幂等）
// 用法：npm run db:seed
// 可通过环境变量 ADMIN_EMAIL / ADMIN_PASSWORD 指定；未指定时生成随机密码并打印
import { loadEnvFile } from "node:process";
try {
  loadEnvFile();
} catch {
  // 无 .env 时使用进程环境变量（部署场景）
}

import { randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`账号已存在，跳过创建：${email}`);
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(password, 10),
      name: "管理员",
      role: "ADMIN",
    },
  });
  await prisma.advisorProfile.create({ data: { userId: user.id } });

  console.log("管理员账号创建成功");
  console.log(`  登录邮箱：${email}`);
  console.log(`  初始密码：${password}`);
  console.log("请登录后尽快在设置中修改密码");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
