/**
 * Shared LLM provider cascade — single source of truth.
 *
 * Order: Cerebras → Groq → Z.ai → Moonshot (full) or Cerebras → Groq → Z.ai (light).
 * Z.ai always uses glm-4.5-air with thinking disabled per CLAUDE.md.
 */
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";

// ── Types ────────────────────────────────────────────────────────

export interface LLMProvider {
  client: OpenAI;
  model: string;
  name: string;
  extraBody?: Record<string, unknown>;
}

// ── Proxy ────────────────────────────────────────────────────────

export function getProxyFetch(): typeof fetch | undefined {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (!proxy) return undefined;
  const agent = new HttpsProxyAgent(proxy);
  return ((url: string, init?: RequestInit) =>
    nodeFetch(url, { ...init, agent } as Parameters<typeof nodeFetch>[1])
  ) as unknown as typeof fetch;
}

// ── Provider factories ───────────────────────────────────────────

/**
 * Full 4-provider cascade for DM/bot endpoints.
 * Cerebras → Groq → Z.ai (glm-4.5-air) → Moonshot
 */
export function getDMProviders(timeout = 8_000): LLMProvider[] {
  const proxyFetch = getProxyFetch();
  const providers: LLMProvider[] = [];

  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.cerebras.ai/v1", apiKey: cerebrasKey, timeout, fetch: proxyFetch }),
      model: "llama3.1-8b", name: "Cerebras",
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: groqKey, timeout, fetch: proxyFetch }),
      model: "llama-3.1-8b-instant", name: "Groq",
    });
  }

  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://open.bigmodel.cn/api/paas/v4", apiKey: zaiKey, timeout, fetch: proxyFetch }),
      model: "glm-4.5-air", name: "Z.ai", extraBody: { thinking: { type: "disabled" } },
    });
  }

  const moonshotKey = process.env.MOONSHOT_API_KEY;
  if (moonshotKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.moonshot.ai/v1", apiKey: moonshotKey, timeout, fetch: proxyFetch }),
      model: "moonshot-v1-8k", name: "Moonshot",
    });
  }

  if (providers.length === 0) throw new Error("No LLM API key set.");
  return providers;
}

/**
 * Light 3-provider cascade for utility endpoints (appearance, portrait, translate).
 * Cerebras → Groq → Z.ai (glm-4.5-air). No Moonshot, no retry.
 */
export function getLightProviders(timeout = 15_000): LLMProvider[] {
  const proxyFetch = getProxyFetch();
  const providers: LLMProvider[] = [];

  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.cerebras.ai/v1", apiKey: cerebrasKey, timeout, fetch: proxyFetch }),
      model: "llama3.1-8b", name: "Cerebras",
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: groqKey, timeout, fetch: proxyFetch }),
      model: "llama-3.1-8b-instant", name: "Groq",
    });
  }

  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://open.bigmodel.cn/api/paas/v4", apiKey: zaiKey, timeout, fetch: proxyFetch }),
      model: "glm-4.5-air", name: "Z.ai", extraBody: { thinking: { type: "disabled" } },
    });
  }

  return providers;
}

/** ZhipuAI last-resort fallback for DM endpoints. */
export function getZhipuFallback(): LLMProvider | null {
  const proxyFetch = getProxyFetch();
  const key = process.env.ZHIPU_API_KEY || process.env.ZAI_API_KEY;
  if (!key) return null;
  return {
    client: new OpenAI({ baseURL: "https://open.bigmodel.cn/api/paas/v4", apiKey: key, timeout: 30_000, fetch: proxyFetch }),
    model: "glm-4.5-air", name: "ZhipuAI-Fallback", extraBody: { thinking: { type: "disabled" } },
  };
}

// ── Retry utilities ──────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  if (status === 429 || status === 502 || status === 503) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("timeout") || msg.includes("econnreset") || msg.includes("econnrefused") ||
      msg.includes("socket hang up") || msg.includes("network") || msg.includes("fetch failed") || msg.includes("aborted");
  }
  return false;
}

const MAX_RETRY_ATTEMPTS = 1;
const RETRY_DELAY_MS = 500;

/** Try a single provider with retry logic. Returns content or null. */
export async function tryProvider(
  provider: LLMProvider,
  messages: OpenAI.ChatCompletionMessageParam[],
  maxTokens = 1024,
): Promise<{ content: string | null; lastError: unknown; providerName: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await provider.client.chat.completions.create({
        model: provider.model, messages, max_tokens: maxTokens, ...provider.extraBody,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);
      const content = response.choices[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        lastError = new Error(`${provider.name} returned empty content`);
        break;
      }
      return { content, lastError: null, providerName: provider.name };
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS);
    }
  }
  return { content: null, lastError, providerName: provider.name };
}

/**
 * Call LLM with full cascade + retry + ZhipuAI fallback.
 * Used by DM and bot endpoints.
 */
export async function callWithCascade(
  messages: OpenAI.ChatCompletionMessageParam[],
  maxTokens = 1024,
): Promise<{ text: string; provider: string }> {
  const providers = getDMProviders();
  let lastError: unknown;
  for (const provider of providers) {
    console.log(`[cascade] Trying provider: ${provider.name} (model=${provider.model})`);
    const result = await tryProvider(provider, messages, maxTokens);
    if (result.content) {
      console.log(`[cascade] ${provider.name} succeeded`);
      return { text: result.content, provider: result.providerName };
    }
    const errMsg = result.lastError instanceof Error ? result.lastError.message : String(result.lastError);
    console.log(`[cascade] ${provider.name} failed: ${errMsg}`);
    lastError = result.lastError;
  }
  const zhipu = getZhipuFallback();
  if (zhipu) {
    console.log(`[cascade] Trying fallback: ${zhipu.name}`);
    const result = await tryProvider(zhipu, messages, maxTokens);
    if (result.content) {
      console.log(`[cascade] ${zhipu.name} succeeded`);
      return { text: result.content, provider: result.providerName };
    }
    const errMsg = result.lastError instanceof Error ? result.lastError.message : String(result.lastError);
    console.log(`[cascade] ${zhipu.name} failed: ${errMsg}`);
    lastError = result.lastError;
  }
  console.log(`[cascade] All providers exhausted, throwing last error`);
  throw lastError;
}
