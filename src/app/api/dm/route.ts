import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt, buildEngineContextMessage } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import { resolveAction } from "@/lib/engine/rules";
import { checkEscalation } from "@/lib/engine/escalation";
import { validateNarrative } from "@/lib/engine/guardrails";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { WorldEvent, NPC, LocationRecord, EngineOutcome, NarrationContext } from "@/types/world";

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
  /** Structured world state from client */
  worldState?: {
    events: WorldEvent[];
    npcs: NPC[];
    locations: LocationRecord[];
  };
}

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

    const events = worldState?.events ?? [];
    const npcs = worldState?.npcs ?? [];
    const locations = worldState?.locations ?? [];

    // ── TRACK 1: Rules Engine (deterministic) ──────────────────────
    const engineOutcome = resolveAction(message, character, gameState, events);

    // Check for escalation (loop prevention)
    const escalation = checkEscalation(events, gameState.location);
    if (escalation) {
      engineOutcome.escalationHint = escalation;
    }

    // Build narration context for the LLM
    const relevantNpcs = npcs.filter(
      (n) => n.location.toLowerCase() === gameState.location.toLowerCase()
    );
    const currentLocation = locations.find(
      (l) => l.name.toLowerCase() === gameState.location.toLowerCase()
    ) ?? null;

    const narrationCtx: NarrationContext = {
      playerAction: message,
      engineOutcome,
      recentEvents: events.slice(-5),
      relevantNpcs,
      currentLocation,
    };

    // ── TRACK 2: LLM Narration ────────────────────────────────────
    const client = getClient();
    const systemPrompt = buildSystemPrompt(character, gameState);
    const engineContext = buildEngineContextMessage(narrationCtx);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-16).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      // Inject engine context as a system message before the user action
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

    // ── GUARDRAILS: Validate LLM output ───────────────────────────
    const validated = validateNarrative(
      parsed.narrative,
      character,
      npcs,
      events,
      gameState.location
    );

    // Merge engine-decided newNpcs with guardrail-detected newNpcs
    const allNewNpcs = [
      ...engineOutcome.newNpcs,
      ...validated.newNpcs,
    ];

    // Build the response: engine outcomes are authoritative, LLM provides narrative
    return NextResponse.json({
      narrative: validated.narrative,
      gameStateUpdate: {
        hpChange: engineOutcome.hpChange || undefined,
        newItems: engineOutcome.itemsGained.length > 0 ? engineOutcome.itemsGained : undefined,
        removeItems: engineOutcome.itemsLost.length > 0 ? engineOutcome.itemsLost : undefined,
        goldChange: engineOutcome.goldChange || undefined,
        locationChange: engineOutcome.locationChange,
        newQuest: engineOutcome.newQuest,
        completeQuest: engineOutcome.completeQuest,
        xpGained: engineOutcome.xpGained || undefined,
      },
      // New fields for the enhanced client
      engineOutcome: {
        roll: engineOutcome.roll,
        escalationHint: engineOutcome.escalationHint ? true : undefined,
      },
      newNpcs: allNewNpcs.length > 0 ? allNewNpcs : undefined,
      warnings: validated.warnings.length > 0 ? validated.warnings : undefined,
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
