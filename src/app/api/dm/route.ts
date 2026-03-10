import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";

const client = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY,
});

interface RequestBody {
  message: string;
  character: Character;
  gameState: Pick<GameState, "location" | "questLog" | "turnCount">;
  history: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { message, character, gameState, history } = body;

    if (!message || !character || !gameState) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(character, gameState);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b",
      messages,
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    const parsed = parseDMResponse(rawText);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("DM API error:", error);
    return NextResponse.json(
      { error: "Failed to get DM response" },
      { status: 500 }
    );
  }
}
