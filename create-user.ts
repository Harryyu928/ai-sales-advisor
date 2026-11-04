import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  "postgresql://postgres.npylkrsppckumxbnoyez:EZjttGC2v9RviU0m@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const passwordHash = bcrypt.hashSync("admin123", 10);

  const user = await prisma.user.upsert({
    where: { id: "admin-local-001" },
    update: {},
    create: {
      id: "admin-local-001",
      email: "mandy@admin.com",
      passwordHash,
      name: "Mandy",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("✅ 用户创建成功：");
  console.log("  - 姓名：", user.name);
  console.log("  - 邮箱：", user.email);
  console.log("  - 角色：", user.role);

  // 同时创建顾问档案
  await prisma.advisorProfile.upsert({
    where: { id: "profile-admin-001" },
    update: {},
    create: {
      id: "profile-admin-001",
      userId: user.id,
    },
  });

  console.log("✅ 顾问档案创建成功");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
