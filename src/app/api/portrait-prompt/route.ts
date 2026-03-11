import { NextResponse } from "next/server";
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";

function getProxyFetch(): typeof fetch | undefined {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (!proxy) return undefined;
  const agent = new HttpsProxyAgent(proxy);
  return ((url: string, init?: RequestInit) =>
    nodeFetch(url, { ...init, agent } as Parameters<typeof nodeFetch>[1])
  ) as unknown as typeof fetch;
}

interface LLMProvider {
  client: OpenAI;
  model: string;
  name: string;
}

function getProviders(): LLMProvider[] {
  const proxyFetch = getProxyFetch();
  const providers: LLMProvider[] = [];

  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://api.cerebras.ai/v1",
        apiKey: cerebrasKey,
        timeout: 15_000,
        fetch: proxyFetch,
      }),
      model: "llama3.1-8b",
      name: "Cerebras",
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: groqKey,
        timeout: 15_000,
        fetch: proxyFetch,
      }),
      model: "llama-3.1-8b-instant",
      name: "Groq",
    });
  }

  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: zaiKey,
        timeout: 15_000,
        fetch: proxyFetch,
      }),
      model: "glm-4-flash",
      name: "Z.ai",
    });
  }

  return providers;
}

const SYSTEM_PROMPT =
  "You are a fantasy portrait prompt engineer. Given a character description and their race, class, and gender, output a single optimized image generation prompt. Format: 'fantasy portrait, [gender] [race] [class], [appearance details], D&D character art, detailed painting, dark fantasy style, face visible, upper body, dramatic lighting'. Output only the prompt text, nothing else. No explanation, no quotes.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, race, characterClass, gender } = body as {
      description: string;
      race: string;
      characterClass: string;
      gender: string;
    };

    if (!description || !race || !characterClass || !gender) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userMessage = `Character: ${gender} ${race} ${characterClass}. Player description: ${description}`;

    const providers = getProviders();
    if (providers.length === 0) {
      // Fallback: build prompt without LLM
      const fallback = `fantasy portrait, ${gender.toLowerCase()} ${race.toLowerCase()} ${characterClass.toLowerCase()}, ${description}, D&D character art, detailed painting, dark fantasy style, face visible, upper body, dramatic lighting`;
      return NextResponse.json({ prompt: fallback });
    }

    for (const provider of providers) {
      try {
        const completion = await provider.client.chat.completions.create({
          model: provider.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 200,
          temperature: 0.7,
        });

        const result = completion.choices[0]?.message?.content?.trim();
        if (result) {
          return NextResponse.json({ prompt: result });
        }
      } catch (err) {
        console.warn(`[portrait-prompt] ${provider.name} failed:`, err instanceof Error ? err.message : err);
        continue;
      }
    }

    // All providers failed — use basic fallback
    const fallback = `fantasy portrait, ${gender.toLowerCase()} ${race.toLowerCase()} ${characterClass.toLowerCase()}, ${description}, D&D character art, detailed painting, dark fantasy style, face visible, upper body, dramatic lighting`;
    return NextResponse.json({ prompt: fallback });
  } catch (err) {
    console.error("[portrait-prompt] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate portrait prompt" },
      { status: 500 }
    );
  }
}
