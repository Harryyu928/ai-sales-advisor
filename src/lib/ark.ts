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
  /** 思考链控制：默认关闭以保证响应速度；需要深度推理时显式 enabled */
  thinking?: { type: "enabled" | "disabled"; budgetTokens?: number };
}

export interface ArkChatResult {
  content: string;
  latencyMs: number;
  model: string;
}

export interface ArkEmbeddingOptions {
  model: string;
  input: string | string[];
  dimensions?: number;
  timeoutMs?: number;
}

export interface ArkEmbeddingResult {
  embeddings: number[][];
  model: string;
  promptTokens: number;
  latencyMs: number;
}

export interface ArkMultimodalEmbeddingInput {
  type: "text" | "image_url" | "video_url";
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
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
    if (opts.thinking) {
      const thinking: Record<string, unknown> = { type: opts.thinking.type };
      if (opts.thinking.budgetTokens) thinking.budget_tokens = opts.thinking.budgetTokens;
      body.thinking = thinking;
    }

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

  /** 文本向量化调用，返回 embedding 向量列表 */
  async embeddings(opts: ArkEmbeddingOptions): Promise<ArkEmbeddingResult> {
    const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];
    const body: Record<string, unknown> = {
      model: opts.model,
      input: inputs,
      encoding_format: "float",
    };
    if (opts.dimensions) body.dimensions = opts.dimensions;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? ARK_DEFAULT_TIMEOUT_MS);
    const started = Date.now();

    try {
      const res = await fetch(`${this.baseUrl}/embeddings`, {
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
            ? "Embedding 接口鉴权失败：请检查 ARK_API_KEY"
            : res.status === 404
              ? "Embedding 模型未找到或未开通，请在火山方舟控制台确认模型ID并开通"
              : res.status === 429
                ? "Embedding 接口限流，请稍后重试"
                : `Embedding 接口错误（${res.status}）：${truncate(text, 200)}`;
        throw new ApiError(status, msg);
      }

      const data = await res.json();
      const dataList: unknown[] = data?.data;
      if (!Array.isArray(dataList) || dataList.length === 0) {
        throw new ApiError(502, "Embedding 接口返回格式异常：缺少 data");
      }

      // 按 index 排序后提取向量
      const sorted = [...dataList].sort(
        (a, b) => (a as { index: number }).index - (b as { index: number }).index
      );
      const embeddings = sorted.map((item) => {
        const emb = (item as { embedding: unknown }).embedding;
        if (!Array.isArray(emb)) {
          throw new ApiError(502, "Embedding 接口返回格式异常：向量不是数组");
        }
        return emb as number[];
      });

      return {
        embeddings,
        model: (data?.model as string) || opts.model,
        promptTokens: data?.usage?.prompt_tokens ?? 0,
        latencyMs,
      };
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new ApiError(504, "Embedding 接口超时");
      }
      throw new ApiError(502, "Embedding 接口网络错误");
    } finally {
      clearTimeout(timer);
    }
  }

  /** 多模态向量化：支持文本/图片/视频输入，当前可用的 embedding 模型走这个端点 */
  async multimodalEmbeddings(opts: {
    model: string;
    inputs: ArkMultimodalEmbeddingInput[];
    dimensions?: number;
    timeoutMs?: number;
  }): Promise<ArkEmbeddingResult> {
    const inputPayload = opts.inputs.map((item) => {
      if (item.type === "text") {
        return { type: "text", text: item.text };
      }
      if (item.type === "image_url") {
        return { type: "image_url", image_url: { url: item.imageUrl } };
      }
      return { type: "video_url", video_url: { url: item.videoUrl } };
    });

    const body: Record<string, unknown> = {
      model: opts.model,
      input: inputPayload,
      encoding_format: "float",
    };
    if (opts.dimensions) body.dimensions = opts.dimensions;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? ARK_DEFAULT_TIMEOUT_MS);
    const started = Date.now();

    try {
      const res = await fetch(`${this.baseUrl}/embeddings/multimodal`, {
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
            ? "多模态 Embedding 接口鉴权失败"
            : res.status === 404
              ? "多模态 Embedding 模型未找到或未开通"
              : res.status === 429
                ? "多模态 Embedding 接口限流，请稍后重试"
                : `多模态 Embedding 接口错误（${res.status}）：${truncate(text, 200)}`;
        throw new ApiError(status, msg);
      }

      const data = await res.json();
      // 多模态端点返回的 data 是单个对象（不是数组），里面有 embedding
      const emb = data?.data?.embedding;
      if (!Array.isArray(emb)) {
        throw new ApiError(502, "多模态 Embedding 返回格式异常：缺少 embedding");
      }

      return {
        embeddings: [emb as number[]],
        model: (data?.model as string) || opts.model,
        promptTokens: data?.usage?.total_tokens ?? 0,
        latencyMs,
      };
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new ApiError(504, "多模态 Embedding 接口超时");
      }
      throw new ApiError(502, "多模态 Embedding 接口网络错误");
    } finally {
      clearTimeout(timer);
    }
  }
}
