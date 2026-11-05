// /api/study-plans —— 备考方案列表（GET）与生成（POST）
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import {
  generateStudyPlan,
  listStudyPlans,
  type GenerateStudyPlanInput,
} from "@/services/study-plan-service";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    const plans = await listStudyPlans(user.id, customerId);
    return NextResponse.json({ ok: true, data: plans });
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "未登录");

    const body = await req.json().catch(() => ({}));
    const input: GenerateStudyPlanInput = {
      customerId: typeof body.customerId === "string" ? body.customerId : null,
      targetExam: typeof body.targetExam === "string" ? body.targetExam : undefined,
      targetScore: typeof body.targetScore === "string" ? body.targetScore : undefined,
      currentLevel: typeof body.currentLevel === "string" ? body.currentLevel : undefined,
      plannedExamDate: typeof body.plannedExamDate === "string" ? body.plannedExamDate : undefined,
      weeklyHours: typeof body.weeklyHours === "string" ? body.weeklyHours : undefined,
      extraNote: typeof body.extraNote === "string" ? body.extraNote : undefined,
    };

    const result = await generateStudyPlan(user.id, input);
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  });
}
