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

export async function POST(req: Request) {
  try {
    const { gender, race, characterClass } = await req.json();

    if (!gender || !race || !characterClass) {
      return NextResponse.json(
        { error: "Missing required fields: gender, race, characterClass" },
        { status: 400 }
      );
    }

    const providers = getProviders();
    if (providers.length === 0) {
      return NextResponse.json(
        { error: "No LLM providers configured" },
        { status: 503 }
      );
    }

    for (const provider of providers) {
      try {
        const completion = await provider.client.chat.completions.create({
          model: provider.model,
          messages: [
            {
              role: "system",
              content: "You are a D&D character appearance generator. Return ONLY valid JSON, no markdown, no explanation.",
            },
            {
              role: "user",
              content: `Generate appearance details for a ${gender} ${race} ${characterClass} D&D character. Create a brief consistent backstory-flavored description filling these fields: Height/Size, Weight/Build, Hair Color & Style, Facial Hair & Color (if applicable), Scars & Markings, Eye Color, Lip Color, Clothing & Armor, Accessories. Return ONLY a JSON object with keys: heightSize, weight, hairColor, facialHair, scars, eyeColor, lipColor, clothing, accessories. Each value max 80 characters. Make them feel like a real character with personality.`,
            },
          ],
          temperature: 0.9,
          max_tokens: 400,
        });

        const raw = completion.choices[0]?.message?.content?.trim() ?? "";

        // Extract JSON from response (handle possible markdown wrapping)
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);

        const fields = [
          "heightSize", "weight", "hairColor", "facialHair",
          "scars", "eyeColor", "lipColor", "clothing", "accessories",
        ] as const;
        const result: Record<string, string> = {};
        for (const field of fields) {
          const val = parsed[field];
          result[field] = typeof val === "string" ? val.slice(0, 80) : "";
        }

        return NextResponse.json(result);
      } catch (err) {
        console.warn(`[generate-appearance] ${provider.name} failed:`, err instanceof Error ? err.message : err);
        continue;
      }
    }

    return NextResponse.json(
      { error: "All providers failed" },
      { status: 502 }
    );
  } catch (err) {
    console.error("[generate-appearance] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate appearance" },
      { status: 500 }
    );
  }
}
