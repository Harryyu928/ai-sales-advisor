// AI 输出结构校验（Zod JSON Schema）与容错 JSON 解析
// 规格书要求：AI 输出必须通过 JSON Schema 校验，非法输出有限次修复重试
import { z } from "zod";

export const SENDER_ROLES = ["customer", "advisor", "unknown"] as const;
export type SenderRole = (typeof SENDER_ROLES)[number];

/** 单条识别消息 */
export const recognizedMessageSchema = z.object({
  order: z.number().int().positive(),
  sender_role: z.enum(SENDER_ROLES),
  content: z.string().min(1),
  timestamp: z.string().nullable().optional(),
  source_image_index: z.number().int().positive().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type RecognizedMessage = z.infer<typeof recognizedMessageSchema>;

/** 整段对话识别结果 */
export const recognitionResultSchema = z.object({
  conversation_title: z.string().nullable().optional(),
  messages: z.array(recognizedMessageSchema).min(1),
  uncertainties: z.array(z.string()).optional().default([]),
  duplicates_removed: z.number().int().nonnegative().optional().default(0),
});
export type RecognitionResult = z.infer<typeof recognitionResultSchema>;

/**
 * 从模型输出文本中容错提取 JSON：
 * 1) 直接解析；2) 去掉 ```json 围栏；3) 提取第一个配平的大括号块
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("AI 输出为空");

  try {
    return JSON.parse(trimmed);
  } catch {
    /* 继续尝试容错解析 */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* 继续 */
    }
  }

  const start = trimmed.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < trimmed.length; i++) {
      if (trimmed[i] === "{") depth++;
      else if (trimmed[i] === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error("无法从 AI 输出中解析 JSON");
}
