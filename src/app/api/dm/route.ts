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

interface LLMProvider {
  client: OpenAI;
  model: string;
  name: string;
  /** Extra body params merged into every chat completion request (e.g. Z.ai thinking config) */
  extraBody?: Record<string, unknown>;
}

/**
 * Build a prioritized list of available LLM providers.
 * Order: Cerebras → Z.ai → Groq → Moonshot
 *   1. Cerebras  — FREE (1M tokens/day), llama3.1-8b
 *   2. Z.ai      — glm-4.5-air ($0.20/M in, $1.10/M out, thinking disabled)
 *   3. Groq      — FREE tier (rate-limited), llama-3.1-8b-instant
 *   4. Moonshot   — PAID last resort, moonshot-v1-8k
 * All use the OpenAI SDK interface.
 */
function getProviders(): LLMProvider[] {
  const proxyFetch = getProxyFetch();
  const providers: LLMProvider[] = [];

  // 1. Cerebras — FREE (1M tokens/day), llama3.1-8b
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://api.cerebras.ai/v1",
        apiKey: cerebrasKey,
        timeout: 30_000,
        fetch: proxyFetch,
      }),
      model: "llama3.1-8b",
      name: "Cerebras",
    });
  }

  // 2. Z.ai — glm-4.5-air (thinking disabled for normal chat completions)
  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        apiKey: zaiKey,
        timeout: 30_000,
        fetch: proxyFetch,
      }),
      model: "glm-4.5-air",
      name: "Z.ai",
      extraBody: { thinking: { type: "disabled" } },
    });
  }

  // 3. Groq — FREE tier (rate-limited ~30k TPM for 8B model)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: groqKey,
        timeout: 30_000,
        fetch: proxyFetch,
      }),
      model: "llama-3.1-8b-instant",
      name: "Groq",
    });
  }

  // 4. Moonshot — PAID last resort (moonshot-v1-8k: $0.20/M in, $2.00/M out)
  const moonshotKey = process.env.MOONSHOT_API_KEY;
  if (moonshotKey) {
    providers.push({
      client: new OpenAI({
        baseURL: "https://api.moonshot.ai/v1",
        apiKey: moonshotKey,
        timeout: 30_000,
        fetch: proxyFetch,
      }),
      model: "moonshot-v1-8k",
      name: "Moonshot",
    });
  }

  if (providers.length === 0) {
    throw new Error("No LLM API key set. Set CEREBRAS_API_KEY, ZAI_API_KEY, GROQ_API_KEY, or MOONSHOT_API_KEY.");
  }

  return providers;
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
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 1500;

/** Sleep for the given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if an error is a timeout/network error worth retrying */
function isRetryableError(error: unknown): boolean {
  // OpenAI SDK errors have a numeric `status` property
  const status = (error as { status?: number }).status;
  if (status === 429 || status === 502 || status === 503) {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("socket hang up") ||
      msg.includes("network") ||
      msg.includes("fetch failed") ||
      msg.includes("aborted")
    );
  }
  return false;
}

/** Make an LLM call, trying each provider in order with retry on retryable errors.
 *  Empty content (200 but no text) is treated as a failure and falls through. */
async function callWithRetry(
  messages: OpenAI.ChatCompletionMessageParam[]
): Promise<string> {
  const providers = getProviders();
  console.error(`[DM API] Starting LLM call with ${providers.length} provider(s): ${providers.map(p => p.name).join(", ")}`);
  let lastError: unknown;

  for (const provider of providers) {
    console.error(`[DM API] Trying ${provider.name} (model: ${provider.model})`);
    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.error(`[DM API] ${provider.name} attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1}...`);
        const response = await provider.client.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: 1024,
          ...provider.extraBody,
        } as OpenAI.ChatCompletionCreateParamsNonStreaming);
        const content = response.choices[0]?.message?.content;
        console.error(`[DM API] ${provider.name} responded, content length: ${content?.length ?? 0}`);
        // Treat empty/null content as failure (e.g. reasoning-token overflow)
        if (!content || content.trim().length === 0) {
          console.error(
            `[DM API] ${provider.name} returned empty content, falling through to next provider`
          );
          lastError = new Error(`${provider.name} returned empty content`);
          break; // Move to next provider (no point retrying empty responses)
        }
        console.error(`[DM API] ${provider.name} succeeded (${content.length} chars)`);
        return content;
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number }).status;
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[DM API] ${provider.name} attempt ${attempt + 1} FAILED: status=${status ?? "N/A"} msg=${errMsg}`
        );
        if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS) {
          console.error(`[DM API] ${provider.name} error not retryable or retries exhausted, moving to next provider`);
          break; // Move to next provider
        }
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.error(`[DM API] ${provider.name} retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
    console.error(`[DM API] ${provider.name} exhausted, trying next provider...`);
  }

  console.error(`[DM API] All providers exhausted. Last error:`, lastError);
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
