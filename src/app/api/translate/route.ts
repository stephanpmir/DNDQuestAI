import { NextResponse } from "next/server";
import { getLightProviders } from "@/lib/ai/providers";

const SYSTEM_PROMPT = `You are a UI translation assistant. You translate UI strings for a fantasy D&D game application.

You will receive a JSON object with string keys and English values. Translate ALL values to the requested language.

Rules:
1. Keep the JSON keys EXACTLY as they are (do not translate keys).
2. Translate the values naturally — use the tone and style appropriate for a dark fantasy RPG game.
3. Keep translations concise — these are button labels, short descriptions, and UI text.
4. Preserve any special characters like "—", quotes, etc.
5. D&D-specific terms (like "D&D", "HP", "XP", "AC") should be kept as-is or use the standard local term.
6. Output ONLY the valid JSON object with translated values. No explanation, no markdown.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language, strings } = body as {
      language: string;
      strings: Record<string, string>;
    };

    if (!language || !strings) {
      return NextResponse.json(
        { error: "Missing language or strings" },
        { status: 400 }
      );
    }

    // No translation needed for English
    if (language.toLowerCase() === "english") {
      return NextResponse.json({ translations: strings });
    }

    const userMessage = `Translate all values to ${language}:\n\n${JSON.stringify(strings, null, 2)}`;

    const providers = getLightProviders(20_000);
    if (providers.length === 0) {
      return NextResponse.json({ translations: strings });
    }

    for (const provider of providers) {
      try {
        const completion = await provider.client.chat.completions.create({
          model: provider.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 2000,
          temperature: 0.3,
        });

        const result = completion.choices[0]?.message?.content?.trim();
        if (result) {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json({ translations: parsed });
          }
        }
      } catch {
        continue;
      }
    }

    // All providers failed — return original strings
    return NextResponse.json({ translations: strings });
  } catch {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
