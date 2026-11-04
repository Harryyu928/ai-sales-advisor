// VisionService：调用豆包视觉模型识别微信聊天截图
// 输入：按顺序排列的截图；输出：通过 JSON Schema 校验的结构化识别结果
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { ArkClient, imageToDataUrl, isArkVisionConfigured, type ArkMessage } from "@/lib/ark";
import { VISION_SYSTEM_PROMPT, buildVisionUserPrompt } from "@/lib/prompts";
import { extractJson, recognitionResultSchema, type RecognitionResult } from "@/lib/schemas";
import { readScreenshotFile } from "@/lib/storage";

export interface ScreenshotInput {
  id: string;
  storagePath: string;
  mimeType: string;
}

export interface RecognizeOutcome {
  result: RecognitionResult;
  latencyMs: number; // 模型调用耗时（毫秒）
  model: string;
  attempts: number; // 实际调用次数（含修复重试）
}

const MAX_RETRY_ATTEMPTS = 2; // 非法输出时的有限修复重试次数

/** 模拟识别结果（ARK_MOCK_VISION=true 时返回）：
 *  对应 scripts/make-mock-screenshots 生成的 3 张连续微信截图（含重叠区域） */
function mockRecognitionResult(): RecognitionResult {
  return {
    conversation_title: "雅思课程咨询（模拟识别演示）",
    messages: [
      { order: 1, sender_role: "customer", content: "老师您好，我想咨询雅思课程", timestamp: "2026-11-03 09:30", source_image_index: 1 },
      { order: 2, sender_role: "advisor", content: "您好！请问您目前的基础和目标分数是？", timestamp: "2026-11-03 09:31", source_image_index: 1 },
      { order: 3, sender_role: "customer", content: "基础一般，目标是6.5", timestamp: "2026-11-03 09:32", source_image_index: 1 },
      {
        order: 4,
        sender_role: "advisor",
        content: "明白，6.5 是很多院校硕士申请的基础线。方便说下您大概什么时候考试吗？",
        timestamp: "2026-11-03 09:33",
        source_image_index: 2,
        note: "本条消息在截图2与截图3中重复出现，已自动合并去重",
      },
      { order: 5, sender_role: "customer", content: "打算明年3月考，来得及吗？", timestamp: "2026-11-03 09:35", source_image_index: 3 },
      { order: 6, sender_role: "advisor", content: "来得及，一般建议预留 3-6 个月备考。我整理一份规划发给您参考。", timestamp: "2026-11-03 09:36", source_image_index: 3 },
    ],
    uncertainties: [],
    duplicates_removed: 4,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 识别多张微信聊天截图（多图一次性传入，模型自行合并去重重建顺序）
 * 模型输出必须通过 JSON Schema 校验；非法输出时携带错误信息重试一次
 */
export async function recognizeScreenshots(inputs: ScreenshotInput[]): Promise<RecognizeOutcome> {
  // 开发专用模拟模式：明确标注，不冒充真实 AI；配置真实 Key 后应移除该分支
  if (env.ARK_MOCK_VISION === "true") {
    await sleep(900);
    return { result: mockRecognitionResult(), latencyMs: 900, model: "mock-vision-fixture", attempts: 1 };
  }

  if (!isArkVisionConfigured()) {
    throw new ApiError(
      503,
      "AI 视觉模型未配置：请在 .env 中配置 ARK_API_KEY 与 ARK_VISION_MODEL（火山方舟模型接入点 ID）"
    );
  }
  if (inputs.length === 0) throw new ApiError(400, "没有待识别的截图");

  // 读取图片并转为 data URL（detail=high 保证文字识别清晰度）
  const imageParts: ArkMessage["content"] = [];
  for (const img of inputs) {
    const buf = await readScreenshotFile(img.storagePath);
    imageParts.push({
      type: "image_url",
      image_url: { url: imageToDataUrl(buf, img.mimeType), detail: "high" },
    });
  }

  const client = new ArkClient();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const recheckNote = attempt > 1 && lastError instanceof Error ? lastError.message : undefined;
    const messages: ArkMessage[] = [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildVisionUserPrompt(inputs.length, recheckNote) },
          ...imageParts,
        ],
      },
    ];

    try {
      const { content, latencyMs, model } = await client.chatWithRetry({
        model: env.ARK_VISION_MODEL!,
        messages,
        temperature: 0.1,
        maxTokens: 8000,
        jsonMode: true,
      });
      const parsed = extractJson(content);
      const result = recognitionResultSchema.parse(parsed);
      return { result, latencyMs, model, attempts: attempt };
    } catch (e) {
      lastError = e;
      // 服务端错误（5xx）已由 chatWithRetry 重试过，这里不再重复调用
      if (e instanceof ApiError && e.status >= 500) break;
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(502, `截图识别失败：${lastError instanceof Error ? lastError.message : "未知错误"}`);
}
