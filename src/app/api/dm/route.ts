import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt, buildEngineContextMessage } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import { preGenerate, postGenerate } from "@/lib/engine/pipeline";
import type { PipelineInput } from "@/lib/engine/pipeline";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { WorldEvent, NPC, LocationRecord } from "@/types/world";
import type { Fact } from "@/lib/engine/fact-ledger";

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
  worldState?: {
    events: WorldEvent[];
    npcs: NPC[];
    locations: LocationRecord[];
    facts: Fact[];
  };
}

const MAX_REGENERATION_ATTEMPTS = 1;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { message, character, gameState, history, worldState } = body;

    if (!message || !character || !gameState) {
      return NextResponse.json(
        { error: "Missing required fields: message, character, and gameState are all required." },
        { status: 400 }
      );
    }

    // ── PIPELINE STEPS 1-4: Pre-generation ────────────────────────
    const pipelineInput: PipelineInput = {
      playerAction: message,
      character,
      gameState,
      chatHistory: history ?? [],
      facts: worldState?.facts ?? [],
      events: worldState?.events ?? [],
      npcs: worldState?.npcs ?? [],
      locations: worldState?.locations ?? [],
    };

    const preResult = preGenerate(pipelineInput);

    // ── PIPELINE STEP 5: LLM Generation ───────────────────────────
    const client = getClient();
    const systemPrompt = buildSystemPrompt(character, gameState);

    let narrative = "";
    let postResult = null;
    let contradictionHint: string | undefined;

    for (let attempt = 0; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
      const engineContext = buildEngineContextMessage(
        message,
        preResult.engineOutcome,
        preResult.formattedContext,
        contradictionHint
      );

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.slice(-10).map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "system", content: engineContext },
        { role: "user", content: message },
      ];

      const response = await client.chat.completions.create({
        model: "llama3.1-8b",
        messages,
        max_tokens: 1024,
      });

      const rawText = response.choices[0]?.message?.content ?? "";
      const parsed = parseDMResponse(rawText);
      narrative = parsed.narrative;

      // ── PIPELINE STEPS 6-7: Validate + Update ───────────────────
      postResult = postGenerate(narrative, pipelineInput, preResult);

      if (!postResult.needsRegeneration || attempt >= MAX_REGENERATION_ATTEMPTS) {
        break;
      }

      // Contradiction found — regenerate with correction hint
      contradictionHint = postResult.regenerationHint;
      console.warn(
        `[Pipeline] Regenerating due to ${postResult.contradictions.length} contradiction(s)`,
        postResult.contradictions.map((c) => c.factContent)
      );
    }

    if (!postResult) {
      throw new Error("Pipeline failed to produce a result");
    }

    // ── PIPELINE STEP 8: Deliver ──────────────────────────────────
    const eo = preResult.engineOutcome;

    return NextResponse.json({
      narrative: postResult.narrative,
      gameStateUpdate: {
        hpChange: eo.hpChange || undefined,
        newItems: eo.itemsGained.length > 0 ? eo.itemsGained : undefined,
        removeItems: eo.itemsLost.length > 0 ? eo.itemsLost : undefined,
        goldChange: eo.goldChange || undefined,
        locationChange: eo.locationChange,
        newQuest: eo.newQuest,
        completeQuest: eo.completeQuest,
        xpGained: eo.xpGained || undefined,
      },
      engineOutcome: {
        roll: eo.roll,
        escalationHint: eo.escalationHint ? true : undefined,
      },
      // Fact ledger updates for the client
      factUpdates: {
        newFacts: postResult.newFacts,
        bumpedFactIds: postResult.bumpedFactIds,
        promotedAnchors: postResult.promotedAnchors,
      },
      newNpcs: postResult.newNpcs.length > 0 ? postResult.newNpcs : undefined,
      contradictions: postResult.contradictions.length > 0
        ? postResult.contradictions.length
        : undefined,
    });
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
