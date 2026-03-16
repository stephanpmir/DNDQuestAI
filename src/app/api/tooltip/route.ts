import { NextResponse } from "next/server";
import { callWithCascade } from "@/lib/ai/providers";

interface RequestBody {
  featureName: string;
  characterClass: string;
  characterLevel: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { featureName, characterClass, characterLevel } = body;

    if (!featureName || !characterClass) {
      return NextResponse.json({ error: "Missing featureName or characterClass" }, { status: 400 });
    }

    const messages = [
      {
        role: "system" as const,
        content: "You are a D&D 5e rules expert. Give concise, accurate mechanical descriptions. No flavor text. No markdown formatting.",
      },
      {
        role: "user" as const,
        content: `Explain the D&D 5e feature "${featureName}" for a level ${characterLevel} ${characterClass} in plain English in 2-3 sentences. Focus on what it does mechanically, when it applies, and any important limitations. No flavor text.`,
      },
    ];

    const { text } = await callWithCascade(messages, 256);
    return NextResponse.json({ description: text.trim() });
  } catch {
    return NextResponse.json({ error: "Failed to generate tooltip" }, { status: 500 });
  }
}
