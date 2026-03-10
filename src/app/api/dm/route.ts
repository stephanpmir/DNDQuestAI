import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";

const anthropic = new Anthropic();

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

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

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
