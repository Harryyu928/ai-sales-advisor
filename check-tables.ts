import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = "postgresql://postgres.npylkrsppckumxbnoyez:EZjttGC2v9RviU0m@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const tables = await prisma.$queryRaw<
    { table_name: string }[]
  >`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;

  console.log("数据库里的表：");
  tables.forEach((t) => console.log(" -", t.table_name));

  console.log(`\n共 ${tables.length} 张表`);

  // 试试查询User表
  try {
    const userCount = await prisma.user.count();
    console.log(`\nUser表有 ${userCount} 个用户`);
  } catch (e) {
    console.log("\nUser表查询失败：", (e as Error).message);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
