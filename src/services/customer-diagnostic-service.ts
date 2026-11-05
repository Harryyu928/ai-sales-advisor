// 客户全维度智能诊断服务 V7.0
// 基于客户真实聊天记录 + 已确认事实，生成结构化销售诊断
import { prisma } from "@/lib/db";
import { ArkClient } from "@/lib/ark";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";

export interface CustomerDiagnosticResult {
  salesStage: string;
  completeness: number; // 0-1
  summary: string;
  patterns: {
    infoPreference?: string;
    compareBeforeDecide?: string;
    detailSeeking?: string;
    priceSensitive?: string;
    effectFocus?: string;
    timeFocus?: string;
    facultyFocus?: string;
    communicationStyle?: string;
    evidenceNote?: string;
  };
  interests: string[];
  needs: { item: string; evidence: string }[];
  concerns: {
    stated: { name: string; evidence: string; firstSeen?: string; resolved: "explained" | "confirmed" | "pending" }[];
    hypotheses: { name: string; reason: string }[];
  };
  unknowns: { field: string; status: "not_asked" | "asked_no_answer" | "conflict"; importance: "high" | "medium" | "low" }[];
  nextBestQuestion: { question: string; why: string; script: string } | null;
  risks: { name: string; severity: "high" | "medium" | "low"; evidence: string; impact: string; suggestion: string }[];
  actions: { name: string; reason: string; script: string }[];
  limitations: string;
}

function buildPrompt(customer: any, facts: any[], messages: any[]): string {
  const factLines = facts
    .filter((f) => f.status === "ACTIVE")
    .map((f) => `- ${f.fieldKey}: ${f.value}（${f.factType === "CONFIRMED" ? "已确认" : "推测"}）`)
    .join("\n");

  const chatLines = messages
    .slice(0, 80)
    .map((m) => `[${m.role === "advisor" ? "顾问" : "客户"}] ${m.content?.slice(0, 300)}`)
    .join("\n");

  const customerMsgs = messages.filter((m) => m.role !== "advisor").length;
  const advisorMsgs = messages.filter((m) => m.role === "advisor").length;

  return `你是资深国际教育销售诊断专家。基于以下客户真实微信聊天记录和已确认事实，输出一份结构化销售诊断。

【客户基本信息】
代号：${customer.code}
角色：${customer.contactRole || "未知"}
目标国家：${customer.targetCountry || "未填写"}
目标考试：${customer.targetExam || "未填写"}
目标分数：${customer.targetScore || "未填写"}
当前水平：${customer.currentLevel || "未填写"}
申请阶段：${customer.applicationStage || "未填写"}

【已确认事实库】
${factLines || "（空）"}

【聊天记录统计】
原始消息共 ${messages.length} 条（客户 ${customerMsgs} 条 + 顾问 ${advisorMsgs} 条）。
注意：以下列出的是原始消息，不要把"意图数"或"信息点"等同于"消息条数"。evidenceNote 中必须写"基于 ${messages.length} 条原始消息"，不要自己重新数数。

【最近聊天记录】
${chatLines || "（无聊天记录）"}

请严格按以下 JSON 结构输出（不要输出其他文字）：
{
  "salesStage": "当前咨询阶段（初次咨询/需求确认/方案比较/试听考虑/成交前沟通/待判断）",
  "completeness": 0.0-1.0,
  "summary": "一句话全景摘要（80字内）",
  "patterns": {
    "infoPreference": "信息获取偏好观察",
    "compareBeforeDecide": "是否倾向先比较再决策",
    "detailSeeking": "是否频繁问细节",
    "priceSensitive": "价格关注度",
    "effectFocus": "学习效果关注度",
    "timeFocus": "时间安排关注度",
    "facultyFocus": "师资服务关注度",
    "communicationStyle": "沟通节奏偏好",
    "evidenceNote": "这些观察基于多少条消息，证据是否充分"
  },
  "interests": ["从聊天中明确提取的兴趣/关注院校/专业，没有则空数组"],
  "needs": [{"item":"已明确需求","evidence":"原文证据","evidenceIndex": 1}],
  "concerns": {
    "stated": [{"name":"顾虑","evidence":"原文","evidenceIndex": 1,"resolved":"explained|confirmed|pending"}],
    "hypotheses": [{"name":"待验证假设","reason":"为什么需要验证"}]
  },
  "unknowns": [{"field":"缺失信息","status":"not_asked|asked_no_answer|conflict","importance":"high|medium|low"}],
  "nextBestQuestion": {
    "question": "当前最该问的唯一主问题（只能一个，不要多个）",
    "why": "为什么先问这个",
    "script": "可直接发给客户的微信话术",
    "followUpQuestions": ["后续排队问题，等客户回答后再逐个问，不要一次全抛"]
  },
  "risks": [{"name":"风险","category":"information|solution|trust|price|closing","severity":"high|medium|low","evidence":"证据","evidenceIndex": 1,"impact":"可能影响","suggestion":"建议"}],
  "actions": [{"name":"行动","reason":"原因","script":"微信话术"}],
  "limitations": "数据不足时的诚实说明"
}

风险分类说明：
- information：信息缺口（不知道预算/时间/背景等），默认 severity=low，不要标成红色警报
- solution：方案匹配风险（需求和课程不匹配）
- trust：信任风险（客户犹豫/质疑/比较中）
- price：价格风险（客户嫌贵/预算不足）
- closing：真正的关单风险（客户明确说要再想想/要走了/不回了）

重要规则：
1. 只基于聊天证据分析，不得编造客户性格、爱好、预算、经济能力。
2. 聊天少于10条时，limitations 必须说明"样本较少，观察仅供参考"。
3. 没有证据的风险不要列。
4. actions 最多3条。
5. 所有判断要克制，宁可说"待观察"也不要下确定结论。
6. evidenceIndex 必须是上面【聊天记录】中该行的序号（从1开始），用于追溯原始消息。
7. nextBestQuestion.question 只能是一个问题，不要把多个问题塞进去。其他问题放 followUpQuestions。
8. 普通信息缺口（不知道预算/时间/背景）标 category=information, severity=low，不要标成 high。只有客户明确表达要离开/不回复/拒绝时才标 category=closing, severity=high。
9. actions 和 nextBestQuestion 里的话术严禁过度承诺：禁止"保证录取""保过""一定能上""肯定来得及""百分百""稳录"等表述。可以说"我们会全力帮你准备""往年类似背景有成功案例"，但不要给确定性承诺。`;
}

export async function runCustomerDiagnostic(customerId: string, userId: string): Promise<CustomerDiagnosticResult & { latencyMs: number; model: string }> {
  const started = Date.now();

  const customer = await prisma.customer.findFirst({ where: { id: customerId, userId } });
  if (!customer) throw new ApiError(404, "客户不存在");

  const facts = await prisma.customerFact.findMany({
    where: { customerId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });

  const conversations = await prisma.conversation.findMany({
    where: { customerId, userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { messages: { orderBy: { sequence: "asc" }, take: 40 } },
  });

  const allMessages = conversations.flatMap((c) => c.messages);
  if (allMessages.length === 0) {
    throw new ApiError(400, "该客户暂无聊天记录，无法诊断。请先上传或粘贴对话。");
  }

  const client = new ArkClient();
  const prompt = buildPrompt(customer, facts, allMessages);

  const result = await client.chatWithRetry({
    model: env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: "你是严谨的销售诊断助手，只输出 JSON。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    maxTokens: 4000,
    jsonMode: true,
    thinking: { type: "disabled" },
    timeoutMs: 90_000,
  });

  let parsed: CustomerDiagnosticResult;
  try {
    const cleaned = result.content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(502, "AI 返回格式异常，请重试");
  }

  // 用真实 Customer 字段按固定权重计算完整度，不依赖 AI 自由打分
  const completenessCalc = calcCompleteness(customer);
  parsed.completeness = completenessCalc.score;
  // 把计算依据附加到 summary 后，让前端可展示
  parsed.summary = `${parsed.summary}｜完整度 ${Math.round(completenessCalc.score * 100)}%（已确认 ${completenessCalc.confirmed}/${completenessCalc.total} 项关键字段）`;

  const latencyMs = Date.now() - started;

  // 保存诊断快照：旧版本标记非最新
  await prisma.customerDiagnostic.updateMany({
    where: { customerId, isLatest: true },
    data: { isLatest: false },
  });

  const latest = await prisma.customerDiagnostic.findFirst({
    where: { customerId },
    orderBy: { version: "desc" },
  });

  await prisma.customerDiagnostic.create({
    data: {
      userId,
      customerId,
      version: (latest?.version ?? 0) + 1,
      salesStage: parsed.salesStage,
      completeness: parsed.completeness,
      summary: parsed.summary,
      patterns: parsed.patterns as any,
      interests: parsed.interests as any,
      needs: parsed.needs as any,
      concerns: parsed.concerns as any,
      unknowns: parsed.unknowns as any,
      nextBestQuestion: parsed.nextBestQuestion as any,
      risks: parsed.risks as any,
      actions: parsed.actions as any,
      limitations: parsed.limitations,
      modelVersion: result.model,
      latencyMs,
      isLatest: true,
    },
  });

  return { ...parsed, latencyMs, model: result.model };
}

/**
 * 基于 Customer 表真实字段按固定权重计算信息完整度。
 * 不依赖 AI 自由打分，确保可解释、可复现。
 */
function calcCompleteness(customer: any): { score: number; confirmed: number; total: number; missing: string[] } {
  // [字段名, 权重%]
  const fields: [string, number][] = [
    ["contactRole", 5],        // 学生/家长身份
    ["targetCountry", 8],      // 目标国家
    ["targetSchool", 8],       // 目标院校
    ["targetMajor", 6],        // 目标专业
    ["targetExam", 10],        // 目标考试
    ["targetScore", 8],        // 目标分数
    ["currentLevel", 8],       // 现有水平
    ["plannedExamDate", 10],   // 计划考试时间
    ["plannedEnrollmentDate", 8], // 计划入学时间
    ["salesStage", 8],         // 咨询阶段
    ["trainingNeeds", 8],      // 培训需求
    ["budgetRange", 7],        // 预算
    ["confirmedNextStep", 6],  // 已确认下一步
  ];

  let confirmed = 0;
  const missing: string[] = [];
  for (const [field, weight] of fields) {
    const val = customer[field];
    const has = val !== null && val !== undefined && String(val).trim() !== "";
    if (has) confirmed += weight;
    else missing.push(field);
  }

  return {
    score: Math.round((confirmed / 100) * 100) / 100,
    confirmed,
    total: 100,
    missing,
  };
}
