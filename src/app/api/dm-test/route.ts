import { NextResponse } from "next/server";

/**
 * Diagnostic: tests server-side connectivity to the configured LLM(s).
 * Visit /api/dm-test in the browser to see JSON results.
 * Order: Cerebras → Z.ai → Groq → Moonshot
 */
export async function GET() {
  const results: Record<string, unknown> = {
    cerebrasKeySet: !!process.env.CEREBRAS_API_KEY,
    zaiKeySet: !!process.env.ZAI_API_KEY,
    groqKeySet: !!process.env.GROQ_API_KEY,
    moonshotKeySet: !!process.env.MOONSHOT_API_KEY,
  };

  // Test Cerebras (llama3.1-8b)
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3.1-8b",
          messages: [{ role: "user", content: "Say hi in 3 words" }],
          max_tokens: 20,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await res.text();
      results.cerebras = {
        success: res.ok,
        status: res.status,
        body: body.slice(0, 500),
      };
    } catch (error) {
      results.cerebras = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Test Z.ai (GLM-4-32B-0414-128K — non-reasoning)
  if (process.env.ZAI_API_KEY) {
    try {
      const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "GLM-4-32B-0414-128K",
          messages: [{ role: "user", content: "Say hi in 3 words" }],
          max_tokens: 20,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await res.text();
      results.zai = {
        success: res.ok,
        status: res.status,
        body: body.slice(0, 500),
      };
    } catch (error) {
      results.zai = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Test Groq (llama-3.1-8b-instant)
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: "Say hi in 3 words" }],
          max_tokens: 20,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await res.text();
      results.groq = {
        success: res.ok,
        status: res.status,
        body: body.slice(0, 500),
      };
    } catch (error) {
      results.groq = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Test Moonshot (moonshot-v1-8k)
  if (process.env.MOONSHOT_API_KEY) {
    try {
      const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`,
        },
        body: JSON.stringify({
          model: "moonshot-v1-8k",
          messages: [{ role: "user", content: "Say hi in 3 words" }],
          max_tokens: 20,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const body = await res.text();
      results.moonshot = {
        success: res.ok,
        status: res.status,
        body: body.slice(0, 500),
      };
    } catch (error) {
      results.moonshot = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return NextResponse.json(results);
}
