// POST /api/conversations/[id]/extract-customer —— 从对话自动提取客户档案
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { extractCustomerFromConversation } from "@/services/customer-extract";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const { id } = await params;
    const result = await extractCustomerFromConversation(id, user.id);

    return NextResponse.json({ ok: true, data: result });
  });
}
