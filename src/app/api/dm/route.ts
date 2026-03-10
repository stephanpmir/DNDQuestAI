import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";

function getClient(): OpenAI {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CEREBRAS_API_KEY is not set. Add it to your environment variables."
    );
  }
  return new OpenAI({
    baseURL: "https://api.cerebras.ai/v1",
    apiKey,
  });
}

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
        { error: "Missing required fields: message, character, and gameState are all required." },
        { status: 400 }
      );
    }

    const client = getClient();
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
      model: "llama3.1-8b",
      messages,
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    const parsed = parseDMResponse(rawText);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("DM API error:", errMsg, error);

    return NextResponse.json(
      { error: `DM API failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
