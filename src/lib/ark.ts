// 火山方舟豆包大模型客户端（OpenAI 兼容 Chat Completions）
// 密钥仅存服务端（环境变量），前端不暴露；模型名通过环境变量配置，不硬编码
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";

export interface ArkTextPart {
  type: "text";
  text: string;
}
export interface ArkImagePart {
  type: "image_url";
  image_url: { url: string; detail?: "low" | "high" | "auto" };
}
export type ArkContentPart = ArkTextPart | ArkImagePart;

export interface ArkMessage {
  role: "system" | "user" | "assistant";
  content: string | ArkContentPart[];
}

export interface ArkChatOptions {
  model: string;
  messages: ArkMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface ArkChatResult {
  content: string;
  latencyMs: number;
  model: string;
}

export const ARK_DEFAULT_TIMEOUT_MS = 120_000;

/** 视觉模型是否已配置（未配置时调用方应返回明确错误，不得假装可用） */
export function isArkVisionConfigured(): boolean {
  return Boolean(env.ARK_API_KEY && env.ARK_VISION_MODEL);
}

/** 文本模型是否已配置 */
export function isArkTextConfigured(): boolean {
  return Boolean(env.ARK_API_KEY && env.ARK_TEXT_MODEL);
}

/** 图片 Buffer 转 data URL（火山方舟图片输入格式） */
export function imageToDataUrl(buf: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export class ArkClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    if (!env.ARK_API_KEY) {
      throw new ApiError(503, "AI 模型未配置：请在 .env 中配置 ARK_API_KEY");
    }
    this.baseUrl = (env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/+$/, "");
    this.apiKey = env.ARK_API_KEY;
  }

  /** 单次 Chat 调用，返回模型文本内容；失败抛出 ApiError */
  async chat(opts: ArkChatOptions): Promise<ArkChatResult> {
    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4000,
      stream: false,
    };
    if (opts.jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? ARK_DEFAULT_TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const status = res.status === 401 || res.status === 403 ? 503 : 502;
        const msg =
          res.status === 401 || res.status === 403
            ? "AI 接口鉴权失败：请检查 ARK_API_KEY"
            : res.status === 429
              ? "AI 接口限流：请求过于频繁，请稍后重试"
              : `AI 接口错误（${res.status}）：${truncate(text, 200)}`;
        throw new ApiError(status, msg);
      }
      const data = await res.json();
      const content: unknown = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new ApiError(502, "AI 接口返回格式异常：缺少 choices[0].message.content");
      }
      return { content, latencyMs, model: (data?.model as string) || opts.model };
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new ApiError(504, "AI 接口超时（60 秒内未返回）");
      }
      throw new ApiError(502, "AI 接口网络错误，请检查网络或 ARK_BASE_URL");
    } finally {
      clearTimeout(timer);
    }
  }

  /** 带有限重试的 Chat 调用（网络错误/5xx/限流时重试一次，总计最多 2 次） */
  async chatWithRetry(opts: ArkChatOptions): Promise<ArkChatResult> {
    try {
      return await this.chat(opts);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 502 || e.status === 504 || e.status === 429)) {
        await sleep(1200);
        return this.chat(opts);
      }
      throw e;
    }
  }
}
