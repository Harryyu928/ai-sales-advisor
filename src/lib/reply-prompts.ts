// AI 回复生成提示词模板（独立模块，不塞进巨型 prompt）

export const STYLE_PRESETS = {
  "brief": {
    label: "简短直接",
    description: "回复简洁、直奔主题，适合快节奏沟通",
    instruction: "回复要简短精炼，直奔要点，每句话不超过20字，避免寒暄和冗余解释。",
  },
  "professional": {
    label: "专业详细",
    description: "专业、有逻辑、信息充分，适合初次咨询",
    instruction: "回复要专业、有结构、信息充分。包含核心建议、理由说明和下一步行动建议。语气正式但不生硬。",
  },
  "natural": {
    label: "更自然",
    description: "像真人聊天一样自然，不像是销售话术",
    instruction: "回复要像微信上真人聊天一样自然亲切，可以用适度的口语表达，不要像官方模板。避免过度热情或过度推销。",
  },
  "gentle": {
    label: "温和引导",
    description: "温和、有耐心，引导客户说出更多需求",
    instruction: "回复要温和有耐心，多提问引导客户表达更多需求，不要急于给方案。先了解情况再提供建议。",
  },
} as const;

export type StylePreset = keyof typeof STYLE_PRESETS;

export interface ReplyContext {
  conversationTitle: string;
  messages: { role: "ADVISOR" | "CUSTOMER" | "UNKNOWN"; content: string; sequence: number }[];
  customerName?: string;
  style?: StylePreset;
  extraContext?: string;
}

/** 构建系统提示词：角色设定 + 业务背景 + 风格要求 */
export function buildSystemPrompt(style: StylePreset = "professional"): string {
  const s = STYLE_PRESETS[style];
  return `你是一位国际教育语言培训机构的资深销售顾问，正在通过微信与潜在客户沟通。

你的工作原则：
1. 先理解客户需求，再提供建议，不要急于推销课程
2. 回复要真诚、有帮助，不夸大、不承诺保过
3. 适合微信聊天的语境：分段清晰、语气自然
4. 每次回复控制在3-5句话，不要太长

${s.instruction}

请直接输出回复内容，不要加引号、不要加解释、不要加"建议回复："之类的前缀。`;
}

/** 构建用户消息：对话历史 + 生成请求 */
export function buildUserPrompt(ctx: ReplyContext): string {
  const history = ctx.messages
    .map((m) => `${m.role === "CUSTOMER" ? "客户" : m.role === "ADVISOR" ? "顾问" : "未知"}：${m.content}`)
    .join("\n");

  return `对话主题：${ctx.conversationTitle || "微信聊天"}

对话记录：
${history}

${ctx.extraContext ? `补充信息：${ctx.extraContext}\n` : ""}请根据以上对话，生成顾问下一步应该回复的内容。只输出回复正文。`;
}

/** 客户意图分析提示词（JSON 模式） */
export const ANALYZE_SYSTEM_PROMPT = `你是一位国际教育咨询顾问分析助手。分析客户对话，输出 JSON 格式的分析结果。

输出格式：
{
  "customerNeed": "客户核心需求（一句话）",
  "stage": "咨询阶段：初次咨询/需求确认/方案讨论/价格敏感/即将签约/售后跟进",
  "keyInfo": ["关键信息1", "关键信息2"],
  "nextStep": "顾问下一步建议（一句话）",
  "sentiment": "积极/中性/犹豫/抗拒"
}`;

export function buildAnalyzeUserPrompt(messages: { role: string; content: string }[]): string {
  const history = messages
    .map((m) => `${m.role === "CUSTOMER" ? "客户" : "顾问"}：${m.content}`)
    .join("\n");
  return `分析以下对话：\n\n${history}`;
}
