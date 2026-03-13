import { NextResponse } from "next/server";
import { getLightProviders } from "@/lib/ai/providers";

export async function POST(req: Request) {
  try {
    const { gender, race, characterClass } = await req.json();

    if (!gender || !race || !characterClass) {
      return NextResponse.json(
        { error: "Missing required fields: gender, race, characterClass" },
        { status: 400 }
      );
    }

    const providers = getLightProviders();
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
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { error: "All providers failed" },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to generate appearance" },
      { status: 500 }
    );
  }
}
