import { NextResponse } from "next/server";

/**
 * Temporary diagnostic: hits all four LLM providers in sequence and returns
 * the raw response JSON + extracted content for each.
 * Visit /api/provider-test in the browser.
 */

interface ProviderConfig {
  name: string;
  url: string;
  model: string;
  keyEnv: string;
  extraBody?: Record<string, unknown>;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "Cerebras",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "llama3.1-8b",
    keyEnv: "CEREBRAS_API_KEY",
  },
  {
    name: "Z.ai",
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4.5-air",
    keyEnv: "ZAI_API_KEY",
    extraBody: { thinking: { type: "disabled" } },
  },
  {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant",
    keyEnv: "GROQ_API_KEY",
  },
  {
    name: "Moonshot",
    url: "https://api.moonshot.ai/v1/chat/completions",
    model: "moonshot-v1-8k",
    keyEnv: "MOONSHOT_API_KEY",
  },
];

export async function GET() {
  const results: Record<string, unknown> = {};

  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey) {
      results[provider.name] = { skipped: true, reason: `${provider.keyEnv} not set` };
      continue;
    }

    try {
      const start = Date.now();
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello in exactly 5 words." },
          ],
          max_tokens: 50,
          ...provider.extraBody,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const elapsed = Date.now() - start;
      const rawBody = await res.text();

      let content: string | null = null;
      let parsedBody: unknown = null;
      try {
        parsedBody = JSON.parse(rawBody);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content = (parsedBody as any)?.choices?.[0]?.message?.content ?? null;
      } catch {
        // body wasn't JSON
      }

      results[provider.name] = {
        success: res.ok,
        status: res.status,
        elapsedMs: elapsed,
        model: provider.model,
        content,
        contentLength: content?.length ?? 0,
        contentEmpty: !content || content.trim().length === 0,
        rawBody: rawBody.slice(0, 800),
      };
    } catch (error) {
      results[provider.name] = {
        success: false,
        model: provider.model,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
