import { NextResponse } from "next/server";
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodeFetch from "node-fetch";
import { buildSystemPrompt, buildEngineContextMessage } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import { preGenerate, postGenerate } from "@/lib/engine/pipeline";
import type { PipelineInput } from "@/lib/engine/pipeline";
import { getRandomThemeForLevel, getRandomCampaign } from "@/lib/campaigns";
import type { CampaignTheme } from "@/lib/campaigns";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { WorldEvent, NPC, LocationRecord } from "@/types/world";
import type { Fact } from "@/lib/engine/fact-ledger";
import { computeNpcDisposition } from "@/lib/karma";
import { runGuardInvestigations, shouldGuardsConfront, buildCrimeContext } from "@/lib/crimes";
import type { Crime } from "@/lib/crimes";

/**
 * Create a proxy-aware fetch function.
 * The OpenAI SDK v6 uses native fetch which ignores https_proxy.
 * We use node-fetch + HttpsProxyAgent as a workaround.
 */
function getProxyFetch(): typeof fetch | undefined {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (!proxy) return undefined;
  const agent = new HttpsProxyAgent(proxy);
  return ((url: string, init?: RequestInit) =>
    nodeFetch(url, { ...init, agent } as Parameters<typeof nodeFetch>[1])
  ) as unknown as typeof fetch;
}

/**
 * LLM client setup.
 * Primary: Z.ai (GLM-4) when ZAI_API_KEY is set
 * Default: Cerebras (Llama 3.1 8B)
 */
function getClient(): { client: OpenAI; model: string } {
  const proxyFetch = getProxyFetch();
  // Try Z.ai first if key is available
  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    return {
      client: new OpenAI({
        baseURL: "https://api.z.ai/api/paas/v4",
        apiKey: zaiKey,
        timeout: 30_000,
        fetch: proxyFetch,
      }),
      model: "glm-4",
    };
  }
  // Default: Cerebras
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (!cerebrasKey) {
    throw new Error("No LLM API key set. Set CEREBRAS_API_KEY (or ZAI_API_KEY).");
  }
  return {
    client: new OpenAI({
      baseURL: "https://api.cerebras.ai/v1",
      apiKey: cerebrasKey,
      timeout: 30_000,
      fetch: proxyFetch,
    }),
    model: "llama3.1-8b",
  };
}

/** Get Cerebras as explicit fallback (when Z.ai is primary but fails) */
function getCerebrasClient(): { client: OpenAI; model: string } | null {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return null;
  const proxyFetch = getProxyFetch();
  return {
    client: new OpenAI({
      baseURL: "https://api.cerebras.ai/v1",
      apiKey,
      timeout: 30_000,
      fetch: proxyFetch,
    }),
    model: "llama3.1-8b",
  };
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
  /** Crime log */
  crimes?: Crime[];
  /** Karma system data */
  karmaData?: {
    karma: number;
    history: { type: string; amount: number; description: string; turn: number }[];
    companions: { id: string; name: string; race: string; class: string; level: number; hp: number; maxHp: number; primaryMod: number; approval: number; disposition: string; moralLeaning: string; personality: { approves: string[]; disapproves: string[]; trait: string; ideal: string; flaw: string; bond: string }; backstory: string; isRecruited: boolean; hasLeft: boolean; recruitedTurn: number; personalQuest?: string; personalQuestComplete: boolean }[];
  };
}

const MAX_REGENERATION_ATTEMPTS = 1;
const MAX_RETRY_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 2000;

/** Sleep for the given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if an error is a timeout/network error worth retrying */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("socket hang up") ||
      msg.includes("network") ||
      msg.includes("fetch failed") ||
      msg.includes("aborted") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("429")
    );
  }
  return false;
}

/** Make an LLM call with exponential backoff retry, with automatic fallback */
async function callWithRetry(
  messages: OpenAI.ChatCompletionMessageParam[]
): Promise<string> {
  const primary = getClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await primary.client.chat.completions.create({
        model: primary.model,
        messages,
        max_tokens: 1024,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS) {
        break;
      }
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[DM API] Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${delay}ms`,
        error instanceof Error ? error.message : error
      );
      await sleep(delay);
    }
  }

  // If primary was Z.ai and it failed, try Cerebras fallback
  if (process.env.ZAI_API_KEY) {
    const fallback = getCerebrasClient();
    if (fallback) {
      console.warn("[DM API] Z.ai failed, falling back to Cerebras...");
      try {
        const response = await fallback.client.chat.completions.create({
          model: fallback.model,
          messages,
          max_tokens: 1024,
        });
        return response.choices[0]?.message?.content ?? "";
      } catch (fallbackError) {
        console.error("[DM API] Fallback also failed:", fallbackError instanceof Error ? fallbackError.message : fallbackError);
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { message, character, gameState, history, worldState, karmaData, crimes } = body;

    if (!message || !character || !gameState) {
      return NextResponse.json(
        { error: "Missing required fields: message, character, and gameState are all required." },
        { status: 400 }
      );
    }

    // ── Set starting location on first turn ────────────────────────
    const isFirstTurn = gameState.turnCount <= 1 && gameState.location === "Unknown";
    let campaignThemeStr = (character.campaignTheme ?? getRandomThemeForLevel(character.level)) as string;
    if (isFirstTurn) {
      const campaign = getRandomCampaign(campaignThemeStr as CampaignTheme);
      gameState.location = campaign.startLocation;
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
      karma: karmaData?.karma ?? character.karma ?? 0,
    };

    const preResult = preGenerate(pipelineInput);

    // ── PIPELINE STEP 5: LLM Generation ───────────────────────────
    const systemPrompt = buildSystemPrompt(
      character,
      gameState,
      karmaData ? { karma: karmaData.karma, history: karmaData.history as import("@/lib/karma").KarmaEvent[] } : undefined,
      karmaData?.companions as import("@/types/companion").Companion[] | undefined,
      campaignThemeStr
    );

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

      const rawText = await callWithRetry(messages);
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

    // ── Crime Processing ────────────────────────────────────────────
    const eo = preResult.engineOutcome;

    // Run guard investigations on existing crimes (background, once per turn)
    const crimeList = crimes ?? [];
    const investigation = runGuardInvestigations(crimeList, gameState.turnCount, character.fame);
    if (investigation) {
      eo.guardInvestigation = {
        crimeId: investigation.crimeId,
        newEvidenceLevel: investigation.newEvidenceLevel,
        narrativeHint: investigation.narrativeHint,
      };
    }

    // Check if guards should confront the player
    const confrontation = shouldGuardsConfront(crimeList, gameState.location);
    if (confrontation) {
      eo.guardConfrontation = {
        crimeType: confrontation.type,
        crimeLocation: confrontation.location,
      };
    }

    // ── PIPELINE STEP 8: Deliver ──────────────────────────────────
    return NextResponse.json({
      narrative: postResult.narrative,
      gameStateUpdate: {
        hpChange: eo.hpChange || undefined,
        newItems: eo.itemsGained.length > 0 ? eo.itemsGained : undefined,
        removeItems: eo.itemsLost.length > 0 ? eo.itemsLost : undefined,
        goldChange: eo.goldChange || undefined,
        locationChange: eo.locationChange ?? (isFirstTurn ? gameState.location : undefined),
        newQuest: eo.newQuest,
        completeQuest: eo.completeQuest,
        xpGained: eo.xpGained || undefined,
        lastRestTurn: eo.lastRestTurn,
        restType: eo.restType,
        raging: eo.raging,
        lastHealTurn: eo.lastHealTurn,
        lastTravelEncounterTurn: eo.lastTravelEncounterTurn,
        resourceUpdates: eo.resourceUpdates,
      },
      engineOutcome: {
        roll: eo.roll,
        escalationHint: eo.escalationHint ? true : undefined,
        restDenied: eo.restDenied || undefined,
        deathSaveResult: eo.deathSaveResult,
        damageDealt: eo.damageDealt,
        isCriticalHit: eo.isCriticalHit,
        damageTaken: eo.damageTaken,
        itemNotFound: eo.itemNotFound,
        equipItem: eo.equipItem,
        identifyItem: eo.identifyItem,
      },
      // Fact ledger updates for the client
      factUpdates: {
        newFacts: postResult.newFacts,
        bumpedFactIds: postResult.bumpedFactIds,
        promotedAnchors: postResult.promotedAnchors,
      },
      newNpcs: postResult.newNpcs.length > 0 ? postResult.newNpcs : undefined,
      // Compute dispositions for newly introduced NPCs based on fame/karma
      npcDispositions: postResult.newNpcs.length > 0
        ? postResult.newNpcs.map((name) => {
            const result = computeNpcDisposition(character.fame, character.karma);
            return { name, ...result };
          })
        : undefined,
      contradictions: postResult.contradictions.length > 0
        ? postResult.contradictions.length
        : undefined,
      karmaChange: eo.karmaChange,
      fameChange: eo.fameChange,
      fameReason: eo.fameReason,
      fameCategory: eo.fameCategory,
      divineEffect: eo.divineEffect,
      crimeDetected: eo.crimeDetected,
      guardInvestigation: eo.guardInvestigation,
      guardConfrontation: eo.guardConfrontation,
      tradeResult: eo.tradeResult,
      pickupResult: eo.pickupResult,
      dropResult: eo.dropResult,
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
