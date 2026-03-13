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
import type { Character, CharacterClass, Race, AbilityScores } from "@/types/character";
import type { GameState } from "@/types/game";
import { getDefaultEquipped, getItemInfo } from "@/lib/items";
import { RACIAL_DATA, applyRacialBonuses } from "@/lib/races";
import { buildResourcePool } from "@/lib/resources";

/**
 * POST /api/bot-test — Self-executing automated playtest endpoint.
 *
 * Creates Zephmir (Female Tiefling Rogue, CHA-focused), starts the game,
 * runs 5 turns, and returns the complete results as JSON.
 */

// ── LLM provider setup (same as /api/bot) ────────────────────────

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
  extraBody?: Record<string, unknown>;
}

function getProviders(): LLMProvider[] {
  const proxyFetch = getProxyFetch();
  const providers: LLMProvider[] = [];

  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.cerebras.ai/v1", apiKey: cerebrasKey, timeout: 30_000, fetch: proxyFetch }),
      model: "llama3.1-8b", name: "Cerebras",
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: groqKey, timeout: 30_000, fetch: proxyFetch }),
      model: "llama-3.1-8b-instant", name: "Groq",
    });
  }

  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://open.bigmodel.cn/api/paas/v4", apiKey: zaiKey, timeout: 30_000, fetch: proxyFetch }),
      model: "glm-4.5-air", name: "Z.ai", extraBody: { thinking: { type: "disabled" } },
    });
  }

  const moonshotKey = process.env.MOONSHOT_API_KEY;
  if (moonshotKey) {
    providers.push({
      client: new OpenAI({ baseURL: "https://api.moonshot.ai/v1", apiKey: moonshotKey, timeout: 30_000, fetch: proxyFetch }),
      model: "moonshot-v1-8k", name: "Moonshot",
    });
  }

  if (providers.length === 0) {
    throw new Error("No LLM API key set.");
  }
  return providers;
}

function getZhipuFallback(): LLMProvider | null {
  const proxyFetch = getProxyFetch();
  const key = process.env.ZHIPU_API_KEY || process.env.ZAI_API_KEY;
  if (!key) return null;
  return {
    client: new OpenAI({ baseURL: "https://open.bigmodel.cn/api/paas/v4", apiKey: key, timeout: 30_000, fetch: proxyFetch }),
    model: "glm-4.5-air", name: "ZhipuAI-Fallback", extraBody: { thinking: { type: "disabled" } },
  };
}

const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  if (status === 429 || status === 502 || status === 503) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("timeout") || msg.includes("econnreset") || msg.includes("econnrefused") ||
      msg.includes("socket hang up") || msg.includes("network") || msg.includes("fetch failed") || msg.includes("aborted");
  }
  return false;
}

async function tryProvider(
  provider: LLMProvider,
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<{ content: string | null; lastError: unknown; providerName: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await provider.client.chat.completions.create({
        model: provider.model, messages, max_tokens: 1024, ...provider.extraBody,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);
      const content = response.choices[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        lastError = new Error(`${provider.name} returned empty content`);
        break;
      }
      return { content, lastError: null, providerName: provider.name };
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS);
    }
  }
  return { content: null, lastError, providerName: provider.name };
}

async function callWithRetry(messages: OpenAI.ChatCompletionMessageParam[]): Promise<{ text: string; provider: string }> {
  const providers = getProviders();
  let lastError: unknown;
  for (const provider of providers) {
    const result = await tryProvider(provider, messages);
    if (result.content) return { text: result.content, provider: result.providerName };
    lastError = result.lastError;
  }
  const zhipu = getZhipuFallback();
  if (zhipu) {
    const result = await tryProvider(zhipu, messages);
    if (result.content) return { text: result.content, provider: result.providerName };
    lastError = result.lastError;
  }
  throw lastError;
}

// ── Character creation (same as /api/bot) ────────────────────────

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
    strength: 8,
    dexterity: 16,
    constitution: 12,
    intelligence: 13,
    wisdom: 10,
    charisma: 17,
  };
  const finalScores = applyRacialBonuses(baseScores, race);
  const abilityScores: AbilityScores = {
    strength: finalScores.strength,
    dexterity: finalScores.dexterity,
    constitution: finalScores.constitution,
    intelligence: finalScores.intelligence,
    wisdom: finalScores.wisdom,
    charisma: finalScores.charisma,
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
    name: "Zephmir",
    gender: "Female",
    race,
    class: cls,
    level: 1,
    hp,
    maxHp: hp,
    ac,
    xp: 0,
    xpToNextLevel: getXpToNextLevel(1),
    abilityScores,
    inventory,
    equipped,
    identifiedItems,
    gold: 15,
    lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 },
    isUnconscious: false,
    isDead: false,
    karma: 0,
    fame: 0,
    skillProficiencies: skillProfs,
    cantrips,
    spells: [],
    racialTraits,
    avatar: { hairStyle: "long", hairColor: "#1a1a2e", skinTone: "#C68642", bodyBuild: "slim", height: "average" },
    resources,
  };
}

// ── Playtest definitions ─────────────────────────────────────────

const TURN_ACTIONS = [
  { label: "Explore surroundings", message: "I carefully explore the surroundings, looking for anything unusual." },
  { label: "Talk to NPC", message: "I approach the nearest NPC and strike up a conversation." },
  { label: "Attempt stealth", message: "I attempt to blend into the shadows and hide from sight." },
  { label: "Attempt persuasion", message: "I try to persuade someone nearby to share useful information." },
  { label: "Initiate combat", message: "I draw my daggers and prepare for combat with the nearest threat." },
];

// ── DM pipeline ──────────────────────────────────────────────────

interface InternalGameState {
  character: Character;
  location: string;
  questLog: string[];
  turnCount: number;
  history: { role: "user" | "assistant"; content: string }[];
}

interface TurnResult {
  turn: number;
  label: string;
  action: string;
  success: boolean;
  responseTimeMs: number;
  provider: string | null;
  narrative: string | null;
  checkRoll: { stat: string; skill: string; dc: number; description: string } | null;
  imagePrompt: string | null;
  error: string | null;
  tagsFound: string[];
  rawResponse: string | null;
}

async function runDMTurn(
  gs: InternalGameState,
  message: string,
  campaignTheme: string,
): Promise<{ narrative: string; checkRoll: TurnResult["checkRoll"]; imagePrompt: string | null; provider: string; tagsFound: string[]; rawResponse: string }> {
  const gameState: Pick<GameState, "location" | "questLog" | "turnCount"> = {
    location: gs.location,
    questLog: gs.questLog,
    turnCount: gs.turnCount,
  };

  const pipelineInput: PipelineInput = {
    playerAction: message,
    character: gs.character,
    gameState,
    chatHistory: gs.history ?? [],
    facts: [],
    events: [],
    npcs: [],
    locations: [],
    karma: gs.character.karma ?? 0,
    groundItems: [],
  };

  const preResult = preGenerate(pipelineInput);
  const systemPrompt = buildSystemPrompt(gs.character, gameState, undefined, undefined, campaignTheme);
  const engineContext = buildEngineContextMessage(message, preResult.engineOutcome, preResult.formattedContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...gs.history.slice(-10).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "system", content: engineContext },
    { role: "user", content: message },
  ];

  const { text: rawText, provider } = await callWithRetry(messages);
  const parsed = parseDMResponse(rawText);

  const postResult = postGenerate(parsed.narrative, pipelineInput, preResult);
  const narrative = postResult.narrative;

  // Detect which bracket tags the LLM included
  const tagPattern = /\[([A-Z_]+)\]/g;
  const tagsFound: string[] = [];
  let tagMatch;
  while ((tagMatch = tagPattern.exec(rawText)) !== null) {
    if (!tagsFound.includes(tagMatch[1])) tagsFound.push(tagMatch[1]);
  }

  // Apply engine outcome to character state
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

  return {
    narrative,
    checkRoll: parsed.checkRequired ? {
      stat: parsed.checkRequired.stat,
      skill: parsed.checkRequired.skill,
      dc: parsed.checkRequired.dc,
      description: parsed.checkRequired.description,
    } : null,
    imagePrompt: parsed.sceneImagePrompt ?? null,
    provider,
    tagsFound,
    rawResponse: rawText,
  };
}

// ── Main handler ─────────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  const startTime = Date.now();
  const turns: TurnResult[] = [];
  const errors: string[] = [];

  // Step 1: Create character
  const character = buildCharacter();

  // Step 2: Determine campaign and build game state
  const campaignTheme = (character.campaignTheme ?? getRandomThemeForLevel(character.level)) as string;
  const campaign = getRandomCampaign(campaignTheme as CampaignTheme);

  const gs: InternalGameState = {
    character,
    location: campaign.startLocation,
    questLog: [],
    turnCount: 0,
    history: [],
  };

  // Step 3: Start game (turn 0)
  gs.turnCount = 1;
  const startMessage = "[SYSTEM: New game started. Introduce the setting, the player's surroundings, and give them a quest hook.]";

  const t0 = Date.now();
  try {
    const result = await runDMTurn(gs, startMessage, campaignTheme);
    turns.push({
      turn: 0,
      label: "Game start",
      action: startMessage,
      success: true,
      responseTimeMs: Date.now() - t0,
      provider: result.provider,
      narrative: result.narrative,
      checkRoll: result.checkRoll,
      imagePrompt: result.imagePrompt,
      error: null,
      tagsFound: result.tagsFound,
      rawResponse: result.rawResponse,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Turn 0 (game start): ${errMsg}`);
    turns.push({
      turn: 0,
      label: "Game start",
      action: startMessage,
      success: false,
      responseTimeMs: Date.now() - t0,
      provider: null,
      narrative: null,
      checkRoll: null,
      imagePrompt: null,
      error: errMsg,
      tagsFound: [],
      rawResponse: null,
    });
  }

  // Step 4: Run 5 turns
  for (let i = 0; i < TURN_ACTIONS.length; i++) {
    const { label, message } = TURN_ACTIONS[i];
    gs.turnCount += 1;
    gs.history.push({ role: "user", content: message });

    const turnStart = Date.now();
    try {
      const result = await runDMTurn(gs, message, campaignTheme);
      turns.push({
        turn: i + 1,
        label,
        action: message,
        success: true,
        responseTimeMs: Date.now() - turnStart,
        provider: result.provider,
        narrative: result.narrative,
        checkRoll: result.checkRoll,
        imagePrompt: result.imagePrompt,
        error: null,
        tagsFound: result.tagsFound,
        rawResponse: result.rawResponse,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Turn ${i + 1} (${label}): ${errMsg}`);
      turns.push({
        turn: i + 1,
        label,
        action: message,
        success: false,
        responseTimeMs: Date.now() - turnStart,
        provider: null,
        narrative: null,
        checkRoll: null,
        imagePrompt: null,
        error: errMsg,
        tagsFound: [],
        rawResponse: null,
      });
    }
  }

  // Step 5: Build summary
  const successfulTurns = turns.filter(t => t.success);
  const totalResponseTime = turns.reduce((sum, t) => sum + t.responseTimeMs, 0);
  const avgResponseTime = turns.length > 0 ? Math.round(totalResponseTime / turns.length) : 0;

  const allNarratives = successfulTurns.map(t => t.narrative).filter(Boolean) as string[];
  const allCheckRolls = successfulTurns.map(t => t.checkRoll).filter(Boolean) as TurnResult["checkRoll"][];
  const allImagePrompts = successfulTurns.map(t => t.imagePrompt).filter(Boolean) as string[];

  // Consistency assessment: check if DM tags are well-formed each turn
  const EXPECTED_TAGS = ["HP", "XP", "GOLD", "LOCATION"];
  const consistencyIssues: string[] = [];
  for (const turn of successfulTurns) {
    const missing = EXPECTED_TAGS.filter(tag => !turn.tagsFound.includes(tag));
    if (missing.length > 0) {
      consistencyIssues.push(`Turn ${turn.turn} (${turn.label}): missing tags [${missing.join(", ")}]`);
    }
  }

  const consistency = {
    totalTurns: turns.length,
    successfulTurns: successfulTurns.length,
    failedTurns: turns.length - successfulTurns.length,
    turnsWithAllExpectedTags: successfulTurns.filter(t => EXPECTED_TAGS.every(tag => t.tagsFound.includes(tag))).length,
    turnsWithCheckRoll: allCheckRolls.length,
    turnsWithImagePrompt: allImagePrompts.length,
    issues: consistencyIssues,
    assessment: consistencyIssues.length === 0 && successfulTurns.length === turns.length
      ? "PASS — All turns returned valid DM responses with expected bracket tags."
      : consistencyIssues.length > 0
        ? `PARTIAL — ${consistencyIssues.length} turn(s) had missing bracket tags.`
        : `FAIL — ${turns.length - successfulTurns.length} turn(s) failed entirely.`,
  };

  return NextResponse.json({
    playtest: {
      character: {
        name: gs.character.name,
        race: gs.character.race,
        class: gs.character.class,
        gender: gs.character.gender,
        level: gs.character.level,
      },
      startedAt: new Date(startTime).toISOString(),
      totalDurationMs: Date.now() - startTime,
    },
    turns,
    summary: {
      narratives: allNarratives,
      checkRolls: allCheckRolls,
      imagePrompts: allImagePrompts,
      avgResponseTimeMs: avgResponseTime,
      errors,
      consistency,
    },
    finalState: {
      hp: gs.character.hp,
      maxHp: gs.character.maxHp,
      xp: gs.character.xp,
      gold: gs.character.gold,
      ac: gs.character.ac,
      location: gs.location,
      questLog: gs.questLog,
      inventory: gs.character.inventory,
      equipped: gs.character.equipped,
    },
  });
}
