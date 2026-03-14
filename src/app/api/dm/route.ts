import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt, buildEngineContextMessage } from "@/lib/ai/dm-prompt";
import { parseDMResponse, enforceGameState } from "@/lib/ai/parse-response";
import { preGenerate, postGenerate } from "@/lib/engine/pipeline";
import type { PipelineInput } from "@/lib/engine/pipeline";
import { getRandomThemeForLevel, getRandomCampaign } from "@/lib/campaigns";
import type { CampaignTheme } from "@/lib/campaigns";
import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { WorldEvent, NPC, LocationRecord } from "@/types/world";
import type { Fact } from "@/lib/engine/fact-ledger";
import { computeNpcDisposition } from "@/lib/karma";
import { runGuardInvestigations, shouldGuardsConfront } from "@/lib/crimes";
import type { Crime } from "@/lib/crimes";
import { callWithCascade } from "@/lib/ai/providers";
import { initCombat, resolveCombatTurn } from "@/lib/combat-engine";
import type { CombatState, CombatRoundResult } from "@/lib/combat-engine";
import { detectRulesQuestion, getRulesAnswer } from "@/lib/rules-detector";

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
  /** Player's chosen UI/game language */
  languagePreference?: string;
  /** Items currently on the ground at the player's location */
  groundItems?: string[];
  /** Active combat state from previous round */
  combatState?: CombatState | null;
  /** Karma system data */
  karmaData?: {
    karma: number;
    history: { type: string; amount: number; description: string; turn: number }[];
    companions: { id: string; name: string; race: string; class: string; level: number; hp: number; maxHp: number; primaryMod: number; approval: number; disposition: string; moralLeaning: string; personality: { approves: string[]; disapproves: string[]; trait: string; ideal: string; flaw: string; bond: string }; backstory: string; isRecruited: boolean; hasLeft: boolean; recruitedTurn: number; personalQuest?: string; personalQuestComplete: boolean }[];
  };
}

const MAX_REGENERATION_ATTEMPTS = 1;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { message, character, gameState, history, worldState, karmaData, crimes, languagePreference } = body;

    if (!message || !character || !gameState) {
      return NextResponse.json(
        { error: "Missing required fields: message, character, and gameState are all required." },
        { status: 400 }
      );
    }

    // ── Rules question interception ────────────────────────────────
    // If the player is asking about game mechanics, return an immediate
    // plain English answer without running the pipeline or calling the LLM.
    if (detectRulesQuestion(message)) {
      const rulesAnswer = getRulesAnswer(message, character);
      return NextResponse.json({
        narrative: rulesAnswer,
        rulesAnswer: true,
        gameStateUpdate: {},
      });
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
      groundItems: body.groundItems ?? [],
    };

    const preResult = preGenerate(pipelineInput);

    // ── COMBAT ROUND RESOLUTION ───────────────────────────────────
    // If combat is active, resolve the round BEFORE calling the LLM
    // so the engine outcome reflects combat results for narration.
    let combatResult: CombatRoundResult | null = null;
    let activeCombatState: CombatState | null = body.combatState ?? null;

    if (activeCombatState?.active) {
      combatResult = resolveCombatTurn(message, character, activeCombatState);
      activeCombatState = combatResult.combatState;

      // Inject combat results into engine outcome
      const eo = preResult.engineOutcome;
      eo.hpChange = (eo.hpChange || 0) + combatResult.playerHpChange;
      eo.damageDealt = combatResult.playerDamage;
      eo.isCriticalHit = combatResult.diceBreakdown.playerAttackRoll?.crit ?? false;
      eo.damageTaken = combatResult.enemyDamage > 0 ? combatResult.enemyDamage : undefined;

      if (combatResult.combatEndReason === "enemy_killed") {
        eo.xpGained = (eo.xpGained || 0) + combatResult.xpAwarded;
        eo.goldChange = (eo.goldChange || 0) + combatResult.goldDropped;
        if (combatResult.itemsDropped.length > 0) {
          eo.itemsGained.push(...combatResult.itemsDropped);
        }
      }
    }

    // ── PIPELINE STEP 5: LLM Generation ───────────────────────────
    const systemPrompt = buildSystemPrompt(
      character,
      gameState,
      karmaData ? { karma: karmaData.karma, history: karmaData.history as import("@/lib/karma").KarmaEvent[] } : undefined,
      karmaData?.companions as import("@/types/companion").Companion[] | undefined,
      campaignThemeStr,
      body.groundItems
    );

    let narrative = "";
    let sceneImagePrompt: string | undefined;
    let checkRequired: { stat: string; skill: string; dc: number; description: string } | undefined;
    let postResult = null;
    let contradictionHint: string | undefined;
    let lastParsed: ReturnType<typeof parseDMResponse> | null = null;
    let lastRawText = "";

    for (let attempt = 0; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
      const engineContext = buildEngineContextMessage(
        message,
        preResult.engineOutcome,
        preResult.formattedContext,
        contradictionHint,
        languagePreference
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

      // Inject combat round narrative so the LLM can use it
      if (combatResult) {
        messages.push({
          role: "system",
          content: `## Combat Round Result\n${combatResult.narrative}${combatResult.combatOver ? `\nCOMBAT ENDED: ${combatResult.combatEndReason}.${combatResult.lootNarrative ? ` ${combatResult.lootNarrative}` : ""}` : `\nEnemy HP: ${combatResult.combatState.enemyHp}/${combatResult.combatState.enemyMaxHp}`}\nNarrate this combat round. Use the dice results above exactly.`,
        });
      }

      const { text: rawText } = await callWithCascade(messages);
      lastRawText = rawText;
      const parsed = parseDMResponse(rawText);
      lastParsed = parsed;
      narrative = parsed.narrative;
      sceneImagePrompt = parsed.sceneImagePrompt;
      checkRequired = parsed.checkRequired;

      // ── Handle COMBAT_START from LLM ──────────────────────────────
      if (parsed.parsedState.combatStart && !activeCombatState?.active) {
        const newCombat = initCombat(parsed.parsedState.combatStart, character);
        if (newCombat) {
          activeCombatState = newCombat;
        }
      }

      // ── PIPELINE STEPS 6-7: Validate + Update ───────────────────
      postResult = postGenerate(narrative, pipelineInput, preResult);

      if (!postResult.needsRegeneration || attempt >= MAX_REGENERATION_ATTEMPTS) {
        break;
      }

      // Contradiction found — regenerate with correction hint
      contradictionHint = postResult.regenerationHint;
    }

    if (!postResult) {
      throw new Error("Pipeline failed to produce a result");
    }

    // ── ENFORCE: Apply parsed state tags to gameState ──────────────
    const eo = preResult.engineOutcome;
    if (lastParsed) {
      const enforced = enforceGameState(
        lastParsed,
        {
          hp: character.hp,
          maxHp: character.maxHp,
          xp: character.xp ?? 0,
          gold: character.gold,
          location: gameState.location,
          inventory: character.inventory,
        },
        {
          hpChange: eo.hpChange,
          goldChange: eo.goldChange,
          xpGained: eo.xpGained,
          locationChange: eo.locationChange,
          itemsGained: eo.itemsGained,
          itemsLost: eo.itemsLost,
          roll: eo.roll ? { success: eo.roll.success, dc: eo.roll.dc } : undefined,
        },
        lastRawText,
        combatResult?.combatEndReason === "enemy_killed" ? {
          gold: combatResult.goldDropped,
          items: combatResult.itemsDropped,
          xp: combatResult.xpAwarded,
          narrative: combatResult.lootNarrative,
        } : undefined,
        { combatState: activeCombatState, character },
        campaignThemeStr,
      );

      // Use enforced values — overwrite engine outcome so the response reflects them
      narrative = enforced.narrative;
      eo.hpChange = enforced.hp - character.hp;
      eo.goldChange = enforced.gold - character.gold;
      eo.xpGained = enforced.xp - (character.xp ?? 0);
      if (enforced.location !== gameState.location) {
        eo.locationChange = enforced.location;
      }
      // Items: enforced.inventory is the final set; compute diff
      const gainedItems = enforced.inventory.filter(
        (item, i) => !character.inventory.includes(item) || enforced.inventory.indexOf(item) !== character.inventory.indexOf(item)
      );
      // Only override if enforced added items beyond what engine already granted
      if (gainedItems.length > eo.itemsGained.length) {
        eo.itemsGained = gainedItems;
      }

      // Handle combat injection from enforceGameState (Fix 3: safe turn combat)
      if (enforced.narrative.includes("[COMBAT_START]") && !activeCombatState?.active) {
        const combatMatch = enforced.narrative.match(/\[COMBAT_START\]\s*(.+?)$/m);
        if (combatMatch) {
          const newCombat = initCombat(combatMatch[1].trim(), character);
          if (newCombat) {
            activeCombatState = newCombat;
          }
          // Strip the [COMBAT_START] line from narrative
          narrative = enforced.narrative.replace(/\[COMBAT_START\][^\n]*/g, "").trim();
        }
      }
    }

    // ── Crime Processing ────────────────────────────────────────────

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

    // ── Force scene image on game start ─────────────────────────────
    if (isFirstTurn && !sceneImagePrompt) {
      sceneImagePrompt = `${gameState.location} dark fantasy establishing shot warm atmospheric lighting`;
    }

    // ── PIPELINE STEP 8: Deliver ──────────────────────────────────
    return NextResponse.json({
      narrative: postResult.narrative,
      sceneImagePrompt,
      checkRequired,
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
      addToGround: eo.addToGround?.length ? eo.addToGround : undefined,
      removeFromGround: eo.removeFromGround?.length ? eo.removeFromGround : undefined,
      // Combat state — sent to client to persist across turns
      combatState: activeCombatState,
      combatResult: combatResult ? {
        diceBreakdown: combatResult.diceBreakdown,
        combatOver: combatResult.combatOver,
        combatEndReason: combatResult.combatEndReason,
        lootNarrative: combatResult.lootNarrative || undefined,
      } : undefined,
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "The winds of fate pause for a moment\u2026 please try again." },
      { status: 500 }
    );
  }
}
