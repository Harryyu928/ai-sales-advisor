// 文本对话解析服务：从粘贴的微信文字中自动识别客户/顾问对话
import { ArkClient, isArkTextConfigured } from "@/lib/ark";
import { ApiError } from "@/lib/api";

export interface ParsedMessage {
  role: "CUSTOMER" | "ADVISOR" | "UNKNOWN";
  content: string;
}

const PARSE_SYSTEM_PROMPT = `你是微信聊天记录解析助手。用户粘贴的是微信聊天文字，你需要：
1. 识别每句话是谁说的（客户还是顾问）
2. 自动合并连续发言
3. 去除时间、头像、系统提示等无关内容

判断规则：
- 客户通常是咨询问题的一方（问价格、问考试、问课程）
- 顾问是回答问题的一方（介绍课程、解答疑问、推销）
- 不确定的标记为 UNKNOWN

严格输出JSON格式：
{
  "messages": [
    {"role": "CUSTOMER", "content": "客户说的话"},
    {"role": "ADVISOR", "content": "顾问说的话"}
  ]
}
只输出JSON，不要其他文字。`;

export async function parseTextConversation(rawText: string): Promise<ParsedMessage[]> {
  if (!isArkTextConfigured()) {
    throw new ApiError(503, "AI 文本模型未配置");
  }

  const client = new ArkClient();
  const result = await client.chat({
    model: process.env.ARK_TEXT_MODEL!,
    messages: [
      { role: "system", content: PARSE_SYSTEM_PROMPT },
      { role: "user", content: `请解析以下微信聊天记录：\n\n${rawText}` },
    ],
    temperature: 0.1,
    maxTokens: 1000,
    jsonMode: true,
  });

  let raw = result.content.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) raw = jsonMatch[0];
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.messages)) {
    throw new ApiError(500, "解析结果格式错误");
  }

  return parsed.messages.map((m: { role: string; content: string }) => ({
    role: (m.role as "CUSTOMER" | "ADVISOR" | "UNKNOWN") || "UNKNOWN",
    content: m.content || "",
  })).filter((m: ParsedMessage) => m.content.trim().length > 0);
}
