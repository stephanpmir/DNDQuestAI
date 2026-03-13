import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt, buildEngineContextMessage } from "@/lib/ai/dm-prompt";
import { parseDMResponse } from "@/lib/ai/parse-response";
import { preGenerate, postGenerate } from "@/lib/engine/pipeline";
import type { PipelineInput } from "@/lib/engine/pipeline";
import { getRandomThemeForLevel, getRandomCampaign } from "@/lib/campaigns";
import type { CampaignTheme } from "@/lib/campaigns";
import type { Character, CharacterClass, Race, AbilityScores } from "@/types/character";
import type { GameState } from "@/types/game";
import { getDefaultEquipped, getItemInfo } from "@/lib/items";
import { RACIAL_DATA, applyRacialBonuses } from "@/lib/races";
import { buildResourcePool } from "@/lib/resources";
import {
  getProxyFetch, callWithCascade, isRetryableError, sleep,
} from "@/lib/ai/providers";

/**
 * GET/POST /api/bot-versus — Dynamic AI vs AI playtest.
 *
 * Our DM pipeline vs Grok (xAI) acting as a real player.
 * Grok reads each DM response and decides its next action dynamically.
 * 10 turns, full structured report at the end.
 */

// ── Grok (xAI) client ───────────────────────────────────────────

function getGrokClient(): OpenAI {
  const key = process.env.XAI_KEY;
  if (!key) throw new Error("XAI_KEY not set — cannot use Grok as player.");
  const proxyFetch = getProxyFetch();
  return new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: key, timeout: 60_000, fetch: proxyFetch });
}

const GROK_MODEL_PRIMARY = "grok-4-fast-reasoning";
const GROK_MODEL_FALLBACK = "grok-code-fast-1";

const GROK_SYSTEM_PROMPT = `You are playing a solo D&D 5e text adventure as Zephmir, a Female Tiefling Rogue with high Charisma.
You are a real player — read the DM's narrative carefully and decide your next action.

Rules for your responses:
1. Respond with a single in-character action (1-2 sentences). Be specific about what you do.
2. Vary your approach across turns: exploration, dialogue/persuasion, stealth, combat, investigation, using items, etc.
3. React to what the DM actually describes — don't ignore NPCs, threats, or story hooks.
4. Play smart: use your strengths (Stealth, Persuasion, Deception, Sleight of Hand).
5. Every 3 turns (turns 3, 6, 9), append a brief out-of-character note in this exact format:
   [OOC_BUG_REPORT] Your observations here
   Flag any: bugs, immersion breaks, rule inaccuracies, missing information, nonsensical narrative, or things that felt off as a player.
   If everything was great, say so.

Format your response as:
ACTION: <your in-character action>
REASONING: <brief explanation of why you chose this>
[OOC_BUG_REPORT] <only on turns 3, 6, 9>`;

const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

// ── Character creation ───────────────────────────────────────────

const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};

function computeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function computeStartingHp(cls: CharacterClass, conScore: number): number {
  const base = HIT_DICE[cls] ?? 8;
  const draconicBonus = cls === "Sorcerer" ? 1 : 0;
  return base + computeModifier(conScore) + draconicBonus;
}

function computeAC(cls: string, dexScore: number, conScore: number, wisScore: number, equipped: string[], fightingStyle?: string): number {
  const dexMod = computeModifier(dexScore);
  const conMod = computeModifier(conScore);
  const wisMod = computeModifier(wisScore);
  const equippedLower = equipped.map(i => i.toLowerCase());
  const hasShield = equippedLower.some(i => i.includes("shield"));
  const shieldBonus = hasShield ? 2 : 0;

  const armorTypes: Record<string, { base: number; type: "light" | "medium" | "heavy" }> = {
    "leather armor": { base: 11, type: "light" },
    "studded leather": { base: 12, type: "light" },
    "scale mail": { base: 14, type: "medium" },
    "chain shirt": { base: 13, type: "medium" },
    "breastplate": { base: 14, type: "medium" },
    "half plate": { base: 15, type: "medium" },
    "chain mail": { base: 16, type: "heavy" },
    "splint armor": { base: 17, type: "heavy" },
    "plate armor": { base: 18, type: "heavy" },
  };

  let armorAC: number | null = null;
  for (const [name, info] of Object.entries(armorTypes)) {
    if (equippedLower.some(i => i.includes(name))) {
      if (info.type === "light") armorAC = info.base + dexMod;
      else if (info.type === "medium") armorAC = info.base + Math.min(dexMod, 2);
      else armorAC = info.base;
      break;
    }
  }

  if (armorAC !== null) {
    let ac = armorAC + shieldBonus;
    if (fightingStyle === "Defense") ac += 1;
    return ac;
  }

  if (cls === "Barbarian") return 10 + dexMod + conMod + shieldBonus;
  if (cls === "Monk") return 10 + dexMod + wisMod;
  if (cls === "Sorcerer") return 13 + dexMod;
  return 10 + dexMod + shieldBonus;
}

const STARTING_EQUIPMENT: Record<string, string[]> = {
  Barbarian: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Greataxe", "Handaxe", "Explorer's Pack"],
  Bard: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Rapier", "Lute", "Leather Armor", "Diplomat's Pack"],
  Cleric: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Mace", "Shield", "Scale Mail", "Priest's Pack", "Holy Symbol"],
  Druid: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Wooden Shield", "Scimitar", "Leather Armor", "Explorer's Pack", "Druidic Focus"],
  Fighter: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Longsword", "Shield", "Chain Mail", "Dungeoneer's Pack"],
  Monk: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Shortsword", "Dungeoneer's Pack"],
  Paladin: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Longsword", "Shield", "Chain Mail", "Priest's Pack", "Holy Symbol"],
  Ranger: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Longbow", "Quiver (20 Arrows)", "Shortsword", "Leather Armor", "Explorer's Pack"],
  Rogue: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Shortsword", "Shortbow", "Quiver (20 Arrows)", "Leather Armor", "Burglar's Pack", "Thieves' Tools"],
  Sorcerer: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Dagger", "Arcane Focus", "Dungeoneer's Pack"],
  Warlock: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Dagger", "Arcane Focus", "Scholar's Pack", "Leather Armor"],
  Wizard: ["Backpack", "Waterskin", "Rations (3 days)", "Torch", "Quarterstaff", "Spellbook", "Arcane Focus", "Scholar's Pack"],
};

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

function getXpToNextLevel(level: number): number {
  if (level >= 20) return Infinity;
  return XP_THRESHOLDS[level] ?? Infinity;
}

function buildCharacter(): Character {
  const cls: CharacterClass = "Rogue";
  const race: Race = "Tiefling";

  const baseScores: Record<string, number> = {
    strength: 8, dexterity: 16, constitution: 12,
    intelligence: 13, wisdom: 10, charisma: 17,
  };
  const finalScores = applyRacialBonuses(baseScores, race);
  const abilityScores: AbilityScores = {
    strength: finalScores.strength, dexterity: finalScores.dexterity,
    constitution: finalScores.constitution, intelligence: finalScores.intelligence,
    wisdom: finalScores.wisdom, charisma: finalScores.charisma,
  };

  const racialTraits = RACIAL_DATA[race]?.traits ?? [];
  const cantrips = ["Thaumaturgy"];
  const skillProfs = ["Stealth", "Persuasion", "Deception", "Sleight of Hand"];

  const hp = computeStartingHp(cls, abilityScores.constitution);
  const inventory = STARTING_EQUIPMENT[cls] ?? STARTING_EQUIPMENT.Fighter;
  const equipped = getDefaultEquipped(inventory);
  const ac = computeAC(cls, abilityScores.dexterity, abilityScores.constitution, abilityScores.wisdom, equipped);
  const identifiedItems = inventory.filter((item) => {
    const info = getItemInfo(item);
    return info?.isMagical;
  });
  const resources = buildResourcePool(cls, race, 1);

  return {
    name: "Zephmir", gender: "Female", race, class: cls, level: 1,
    hp, maxHp: hp, ac, xp: 0, xpToNextLevel: getXpToNextLevel(1),
    abilityScores, inventory, equipped, identifiedItems,
    gold: 15, lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 },
    isUnconscious: false, isDead: false,
    karma: 0, fame: 0,
    skillProficiencies: skillProfs, cantrips, spells: [], racialTraits,
    avatar: { hairStyle: "long", hairColor: "#1a1a2e", skinTone: "#C68642", bodyBuild: "slim", height: "average" },
    resources,
  };
}

// ── DM pipeline ──────────────────────────────────────────────────

interface InternalGameState {
  character: Character;
  location: string;
  questLog: string[];
  turnCount: number;
  history: { role: "user" | "assistant"; content: string }[];
}

interface DMTurnResult {
  narrative: string;
  checkRoll: { stat: string; skill: string; dc: number; description: string } | null;
  imagePrompt: string | null;
  provider: string;
  tagsFound: string[];
  rawResponse: string;
}

async function runDMTurn(
  gs: InternalGameState,
  message: string,
  campaignTheme: string,
): Promise<DMTurnResult> {
  const gameState: Pick<GameState, "location" | "questLog" | "turnCount"> = {
    location: gs.location, questLog: gs.questLog, turnCount: gs.turnCount,
  };

  const pipelineInput: PipelineInput = {
    playerAction: message, character: gs.character, gameState,
    chatHistory: gs.history ?? [], facts: [], events: [], npcs: [],
    locations: [], karma: gs.character.karma ?? 0, groundItems: [],
  };

  const preResult = preGenerate(pipelineInput);
  const systemPrompt = buildSystemPrompt(gs.character, gameState, undefined, undefined, campaignTheme);
  const engineContext = buildEngineContextMessage(message, preResult.engineOutcome, preResult.formattedContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...gs.history.slice(-10).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "system", content: engineContext },
    { role: "user", content: message },
  ];

  const { text: rawText, provider } = await callWithCascade(messages);
  const parsed = parseDMResponse(rawText);
  const postResult = postGenerate(parsed.narrative, pipelineInput, preResult);
  const narrative = postResult.narrative;

  const tagPattern = /\[([A-Z_]+)\]/g;
  const tagsFound: string[] = [];
  let tagMatch;
  while ((tagMatch = tagPattern.exec(rawText)) !== null) {
    if (!tagsFound.includes(tagMatch[1])) tagsFound.push(tagMatch[1]);
  }

  const eo = preResult.engineOutcome;
  if (eo.hpChange) gs.character.hp = Math.max(0, Math.min(gs.character.maxHp, gs.character.hp + eo.hpChange));
  if (eo.itemsGained.length > 0) gs.character.inventory.push(...eo.itemsGained);
  if (eo.itemsLost.length > 0) {
    for (const item of eo.itemsLost) {
      const idx = gs.character.inventory.indexOf(item);
      if (idx !== -1) gs.character.inventory.splice(idx, 1);
    }
  }
  if (eo.goldChange) gs.character.gold += eo.goldChange;
  if (eo.xpGained) gs.character.xp += eo.xpGained;
  if (eo.locationChange) gs.location = eo.locationChange;
  if (eo.newQuest && !gs.questLog.includes(eo.newQuest)) gs.questLog.push(eo.newQuest);
  if (eo.completeQuest) gs.questLog = gs.questLog.filter(q => q !== eo.completeQuest);

  gs.history.push({ role: "assistant", content: narrative });

  return { narrative, checkRoll: parsed.checkRequired ? { stat: parsed.checkRequired.stat, skill: parsed.checkRequired.skill, dc: parsed.checkRequired.dc, description: parsed.checkRequired.description } : null, imagePrompt: parsed.sceneImagePrompt ?? null, provider, tagsFound, rawResponse: rawText };
}

// ── Grok player turn ─────────────────────────────────────────────

interface GrokResponse {
  action: string;
  reasoning: string;
  bugReport: string | null;
  rawResponse: string;
}

function isGrokRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return msg.includes("502") || msg.includes("429");
  }
  return false;
}

const GROK_BACKOFF_MS = [800, 1600, 3200];

async function callGrokWithModel(
  grokClient: OpenAI,
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  const response = await grokClient.chat.completions.create({
    model,
    messages,
    max_tokens: 512,
  });
  const content = response.choices[0]?.message?.content;
  if (!content || content.trim().length === 0) throw new Error("Grok returned empty content");
  return content;
}

async function callGrokWithRetries(
  grokClient: OpenAI,
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= GROK_BACKOFF_MS.length; attempt++) {
    try {
      return await callGrokWithModel(grokClient, model, messages);
    } catch (error) {
      lastError = error;
      if (!isGrokRetryableError(error)) throw error;
      if (attempt < GROK_BACKOFF_MS.length) await sleep(GROK_BACKOFF_MS[attempt]);
    }
  }
  throw lastError;
}

async function callGrok(
  grokClient: OpenAI,
  grokHistory: OpenAI.ChatCompletionMessageParam[],
  dmNarrative: string,
  turnNumber: number,
): Promise<GrokResponse> {
  const userMessage = `Turn ${turnNumber} — DM says:\n\n${dmNarrative}\n\nWhat do you do?${turnNumber % 3 === 0 ? " (Remember to include your [OOC_BUG_REPORT] this turn.)" : ""}`;

  grokHistory.push({ role: "user", content: userMessage });

  const fullMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: GROK_SYSTEM_PROMPT },
    ...grokHistory,
  ];

  let content: string;
  try {
    content = await callGrokWithRetries(grokClient, GROK_MODEL_PRIMARY, fullMessages);
  } catch (primaryError) {
    // Only fall back if primary exhausted retries on 502/429
    if (!isGrokRetryableError(primaryError)) throw primaryError;
    content = await callGrokWithRetries(grokClient, GROK_MODEL_FALLBACK, fullMessages);
  }

  grokHistory.push({ role: "assistant", content });

  const actionMatch = content.match(/ACTION:\s*(.+?)(?:\n|$)/i);
  const reasoningMatch = content.match(/REASONING:\s*(.+?)(?:\n|$)/i);
  const bugMatch = content.match(/\[OOC_BUG_REPORT\]\s*([\s\S]+?)$/im);

  return {
    action: actionMatch?.[1]?.trim() ?? content.split("\n")[0].trim(),
    reasoning: reasoningMatch?.[1]?.trim() ?? "",
    bugReport: bugMatch?.[1]?.trim() ?? null,
    rawResponse: content,
  };
}

// ── Turn log types ───────────────────────────────────────────────

interface TurnGameState {
  hp: number;
  maxHp: number;
  xp: number;
  gold: number;
  ac: number;
  location: string;
  karma: number;
  fame: number;
  worn: string[];
  backpack: string[];
}

interface VersusTurn {
  turn: number;
  grok: {
    action: string;
    reasoning: string;
    responseTimeMs: number;
    bugReport: string | null;
    rawResponse: string;
  } | null;
  dm: {
    narrative: string;
    provider: string;
    responseTimeMs: number;
    checkRoll: DMTurnResult["checkRoll"];
    imagePrompt: string | null;
    tagsFound: string[];
    rawResponse: string;
  };
  gameState: TurnGameState | null;
  error: string | null;
}

// ── Main handler ─────────────────────────────────────────────────

const TOTAL_TURNS = 10;

function snapshotGameState(gs: InternalGameState): TurnGameState {
  const worn = [...gs.character.equipped];
  const wornLower = new Set(worn.map(i => i.toLowerCase()));
  const backpack = gs.character.inventory.filter(i => !wornLower.has(i.toLowerCase()));
  return {
    hp: gs.character.hp, maxHp: gs.character.maxHp,
    xp: gs.character.xp, gold: gs.character.gold, ac: gs.character.ac,
    location: gs.location,
    karma: gs.character.karma ?? 0, fame: gs.character.fame ?? 0,
    worn, backpack,
  };
}

async function runVersus(): Promise<NextResponse> {
  const startTime = Date.now();
  const turns: VersusTurn[] = [];
  const bugNotes: { turn: number; note: string }[] = [];
  const errors: string[] = [];

  // Init character and campaign
  const character = buildCharacter();
  const campaignTheme = (character.campaignTheme ?? getRandomThemeForLevel(character.level)) as string;
  const campaign = getRandomCampaign(campaignTheme as CampaignTheme);

  const gs: InternalGameState = {
    character, location: campaign.startLocation, questLog: [], turnCount: 0, history: [],
  };

  // Init Grok
  const grokClient = getGrokClient();
  const grokHistory: OpenAI.ChatCompletionMessageParam[] = [];

  // Turn 0: Game start — DM introduces the world
  gs.turnCount = 1;
  const startMessage = "[SYSTEM: New game started. Introduce the setting, the player's surroundings, and give them a quest hook.]";

  const t0dm = Date.now();
  let openingNarrative: string;
  try {
    const dmResult = await runDMTurn(gs, startMessage, campaignTheme);
    openingNarrative = dmResult.narrative;
    turns.push({
      turn: 0, grok: null,
      dm: {
        narrative: dmResult.narrative, provider: dmResult.provider,
        responseTimeMs: Date.now() - t0dm, checkRoll: dmResult.checkRoll,
        imagePrompt: dmResult.imagePrompt, tagsFound: dmResult.tagsFound,
        rawResponse: dmResult.rawResponse,
      },
      gameState: snapshotGameState(gs),
      error: null,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Turn 0 (game start): ${errMsg}`);
    return NextResponse.json({ error: "DM failed on opening turn", details: errMsg }, { status: 500 });
  }

  // Turns 1–10: Grok reads DM → chooses action → DM responds
  let lastNarrative = openingNarrative;

  for (let i = 1; i <= TOTAL_TURNS; i++) {
    gs.turnCount += 1;

    // Grok's turn
    const grokStart = Date.now();
    let grokResult: GrokResponse;
    try {
      grokResult = await callGrok(grokClient, grokHistory, lastNarrative, i);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Turn ${i} Grok failed: ${errMsg}`);
      turns.push({ turn: i, grok: null, dm: { narrative: "", provider: "", responseTimeMs: 0, checkRoll: null, imagePrompt: null, tagsFound: [], rawResponse: "" }, gameState: snapshotGameState(gs), error: `Grok failed: ${errMsg}` });
      continue;
    }
    const grokTimeMs = Date.now() - grokStart;

    if (grokResult.bugReport) {
      bugNotes.push({ turn: i, note: grokResult.bugReport });
    }

    // Feed Grok's action into DM pipeline
    gs.history.push({ role: "user", content: grokResult.action });
    const dmStart = Date.now();
    try {
      const dmResult = await runDMTurn(gs, grokResult.action, campaignTheme);
      lastNarrative = dmResult.narrative;

      turns.push({
        turn: i,
        grok: {
          action: grokResult.action, reasoning: grokResult.reasoning,
          responseTimeMs: grokTimeMs, bugReport: grokResult.bugReport,
          rawResponse: grokResult.rawResponse,
        },
        dm: {
          narrative: dmResult.narrative, provider: dmResult.provider,
          responseTimeMs: Date.now() - dmStart, checkRoll: dmResult.checkRoll,
          imagePrompt: dmResult.imagePrompt, tagsFound: dmResult.tagsFound,
          rawResponse: dmResult.rawResponse,
        },
        gameState: snapshotGameState(gs),
        error: null,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Turn ${i} DM failed: ${errMsg}`);
      turns.push({
        turn: i,
        grok: {
          action: grokResult.action, reasoning: grokResult.reasoning,
          responseTimeMs: grokTimeMs, bugReport: grokResult.bugReport,
          rawResponse: grokResult.rawResponse,
        },
        dm: { narrative: "", provider: "", responseTimeMs: Date.now() - dmStart, checkRoll: null, imagePrompt: null, tagsFound: [], rawResponse: "" },
        gameState: snapshotGameState(gs),
        error: `DM failed: ${errMsg}`,
      });
    }
  }

  // Build summary report
  const successfulTurns = turns.filter(t => !t.error);

  // Validate actual state changes — flag if values never change across all turns
  const consistencyIssues: string[] = [];
  const statesWithData = turns.map(t => t.gameState).filter(Boolean) as TurnGameState[];
  if (statesWithData.length >= 2) {
    const first = statesWithData[0];
    const hpFrozen = statesWithData.every(s => s.hp === first.hp && s.maxHp === first.maxHp);
    const xpFrozen = statesWithData.every(s => s.xp === first.xp);
    const goldFrozen = statesWithData.every(s => s.gold === first.gold);
    const locationFrozen = statesWithData.every(s => s.location === first.location);
    if (hpFrozen) consistencyIssues.push("HP never changed across all turns — state may be frozen");
    if (xpFrozen) consistencyIssues.push("XP never changed across all turns — state may be frozen");
    if (goldFrozen) consistencyIssues.push("Gold never changed across all turns — state may be frozen");
    if (locationFrozen) consistencyIssues.push("Location never changed across all turns — state may be frozen");
  }

  const grokTimes = turns.filter(t => t.grok).map(t => t.grok!.responseTimeMs);
  const dmTimes = turns.map(t => t.dm.responseTimeMs).filter(t => t > 0);
  const avgGrokTime = grokTimes.length > 0 ? Math.round(grokTimes.reduce((a, b) => a + b, 0) / grokTimes.length) : 0;
  const avgDMTime = dmTimes.length > 0 ? Math.round(dmTimes.reduce((a, b) => a + b, 0) / dmTimes.length) : 0;

  const checkRolls = successfulTurns.map(t => t.dm.checkRoll).filter(Boolean);
  const imagePrompts = successfulTurns.map(t => t.dm.imagePrompt).filter(Boolean);

  // Score: percentage of tracked fields (HP, XP, gold, location) that actually changed
  const trackedFields = 4;
  const fieldsChanged = [
    statesWithData.length >= 2 && !statesWithData.every(s => s.hp === statesWithData[0].hp && s.maxHp === statesWithData[0].maxHp),
    statesWithData.length >= 2 && !statesWithData.every(s => s.xp === statesWithData[0].xp),
    statesWithData.length >= 2 && !statesWithData.every(s => s.gold === statesWithData[0].gold),
    statesWithData.length >= 2 && !statesWithData.every(s => s.location === statesWithData[0].location),
  ].filter(Boolean).length;
  const narrativeConsistencyScore = statesWithData.length >= 2
    ? Math.round((fieldsChanged / trackedFields) * 100)
    : 0;

  return NextResponse.json({
    versus: {
      character: { name: "Zephmir", race: "Tiefling", class: "Rogue", gender: "Female", level: 1 },
      campaign: campaignTheme,
      startedAt: new Date(startTime).toISOString(),
      totalDurationMs: Date.now() - startTime,
      totalTurns: turns.length,
    },
    turns,
    report: {
      bugNotes,
      narrativeConsistencyScore: `${narrativeConsistencyScore}%`,
      consistencyIssues,
      checkRollAssessment: {
        totalCheckRolls: checkRolls.length,
        details: checkRolls,
      },
      imagePrompts,
      avgResponseTimes: {
        grokMs: avgGrokTime,
        dmMs: avgDMTime,
      },
      errors,
      overallAssessment: errors.length === 0 && consistencyIssues.length === 0
        ? "PASS — All turns completed successfully with consistent DM responses."
        : errors.length > 0
          ? `ISSUES — ${errors.length} error(s) occurred during the match.`
          : `PARTIAL — ${consistencyIssues.length} consistency issue(s) found.`,
    },
    finalState: {
      hp: gs.character.hp, maxHp: gs.character.maxHp,
      xp: gs.character.xp, gold: gs.character.gold, ac: gs.character.ac,
      location: gs.location, questLog: gs.questLog,
      inventory: gs.character.inventory, equipped: gs.character.equipped,
    },
  });
}

export async function POST(): Promise<NextResponse> {
  return runVersus();
}

export async function GET(): Promise<NextResponse> {
  return runVersus();
}
