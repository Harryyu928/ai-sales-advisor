export { cn } from "cn"

import type { Prisma } from "@/generated/prisma/client";

/**
 * 把类型化对象转为 Prisma Json 字段可接受的普通 JSON 值。
 * 仅用于纯数据（无 Date/函数），通过序列化去除自定义 interface 的索引签名限制。
 */
export function toPlainJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
