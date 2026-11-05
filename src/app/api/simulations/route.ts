// /api/simulations —— 多轮客户沟通模拟（POST）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { simulateCustomerReply } from "@/services/simulation-service";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json().catch(() => ({}));
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const draftReply = typeof body.draftReply === "string" ? body.draftReply : "";

    if (!conversationId) throw new ApiError(400, "缺少对话标识");
    if (!draftReply.trim()) throw new ApiError(400, "缺少准备发送的回复");

    const result = await simulateCustomerReply(user.id, conversationId, draftReply);
    return NextResponse.json({ ok: true, data: result });
  });
}
