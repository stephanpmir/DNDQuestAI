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
import { getItemInfo } from "@/lib/items";
import { RACIAL_DATA, applyRacialBonuses } from "@/lib/races";
import { buildResourcePool } from "@/lib/resources";
import { callWithCascade } from "@/lib/ai/providers";

/**
 * POST /api/bot — Stateless JSON API for programmatic game control.
 *
 * Actions: create_character, start_game, player_action, get_state
 */

// ── Character creation helpers ──────────────────────────────────

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

  // Unarmored defense
  if (cls === "Barbarian") return 10 + dexMod + conMod + shieldBonus;
  if (cls === "Monk") return 10 + dexMod + wisMod;
  if (cls === "Sorcerer") return 13 + dexMod;
  return 10 + dexMod + shieldBonus;
}

const STARTING_EQUIPMENT: Record<string, { worn: string[]; backpack: string[] }> = {
  Barbarian: {
    worn: ["Greataxe", "Handaxe"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Explorer's Pack"],
  },
  Bard: {
    worn: ["Rapier", "Leather Armor"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Lute", "Diplomat's Pack"],
  },
  Cleric: {
    worn: ["Mace", "Scale Mail", "Shield", "Holy Symbol"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Priest's Pack"],
  },
  Druid: {
    worn: ["Scimitar", "Leather Armor", "Wooden Shield", "Druidic Focus"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Explorer's Pack"],
  },
  Fighter: {
    worn: ["Longsword", "Chain Mail", "Shield"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Dungeoneer's Pack"],
  },
  Monk: {
    worn: ["Shortsword"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Dart x10", "Dungeoneer's Pack"],
  },
  Paladin: {
    worn: ["Longsword", "Chain Mail", "Shield", "Holy Symbol"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Priest's Pack"],
  },
  Ranger: {
    worn: ["Shortsword", "Shortbow", "Leather Armor"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Quiver with 20 Arrows", "Explorer's Pack"],
  },
  Rogue: {
    worn: ["Shortsword", "Shortbow", "Leather Armor", "Thieves' Tools"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Quiver with 20 Arrows", "Burglar's Pack"],
  },
  Sorcerer: {
    worn: ["Dagger", "Arcane Focus"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Dungeoneer's Pack"],
  },
  Warlock: {
    worn: ["Dagger", "Arcane Focus", "Leather Armor"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Scholar's Pack"],
  },
  Wizard: {
    worn: ["Quarterstaff", "Arcane Focus"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Spellbook", "Scholar's Pack"],
  },
};

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

function getXpToNextLevel(level: number): number {
  if (level >= 20) return Infinity;
  return XP_THRESHOLDS[level] ?? Infinity;
}

/** Build a full Character object from minimal creation data */
function buildCharacter(data: {
  name: string;
  gender: string;
  race: string;
  class: string;
  abilityScores: AbilityScores;
  skillProficiencies?: string[];
  cantrips?: string[];
  spells?: string[];
  fightingStyle?: string;
  campaignTheme?: string;
}): Character {
  const cls = data.class as CharacterClass;
  const race = data.race as Race;

  // Apply racial bonuses
  const baseScores: Record<string, number> = { ...data.abilityScores };
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
  const cantrips = [...(data.cantrips ?? [])];
  if (race === "Tiefling" && !cantrips.includes("Thaumaturgy")) cantrips.push("Thaumaturgy");

  const skillProfs = [...(data.skillProficiencies ?? [])];
  if (race === "Elf" && !skillProfs.includes("Perception")) skillProfs.push("Perception");
  if (race === "Half-Orc" && !skillProfs.includes("Intimidation")) skillProfs.push("Intimidation");

  const hp = computeStartingHp(cls, abilityScores.constitution);
  const gear = STARTING_EQUIPMENT[cls] ?? STARTING_EQUIPMENT.Fighter;
  const equipped = [...gear.worn];
  const inventory = [...gear.worn, ...gear.backpack];
  const ac = computeAC(cls, abilityScores.dexterity, abilityScores.constitution, abilityScores.wisdom, equipped, data.fightingStyle);
  const identifiedItems = inventory.filter((item) => {
    const info = getItemInfo(item);
    return info?.isMagical;
  });
  const resources = buildResourcePool(cls, race, 1);

  return {
    name: data.name,
    gender: data.gender as Character["gender"],
    race: race as Character["race"],
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
    spells: data.spells ?? [],
    fightingStyle: data.fightingStyle,
    racialTraits,
    campaignTheme: data.campaignTheme,
    avatar: { hairStyle: "short", hairColor: "#3d2b1f", skinTone: "#c68642", bodyBuild: "average", height: "average" },
    resources,
  };
}

// ── Bot request/response types ──────────────────────────────────

interface BotRequest {
  action: "create_character" | "start_game" | "player_action" | "get_state";
  character?: Record<string, unknown>;
  gameState?: {
    character: Character;
    location: string;
    questLog: string[];
    turnCount: number;
    history: { role: "user" | "assistant"; content: string }[];
  };
  message?: string;
}

interface BotResponse {
  success: boolean;
  gameState: {
    character: Character;
    location: string;
    questLog: string[];
    turnCount: number;
    history: { role: "user" | "assistant"; content: string }[];
  } | null;
  dmResponse: string | null;
  checkRoll: { stat: string; skill: string; dc: number } | null;
  imagePrompt: string | null;
  error: string | null;
}

function errorResponse(msg: string, status = 400): NextResponse<BotResponse> {
  return NextResponse.json({
    success: false,
    gameState: null,
    dmResponse: null,
    checkRoll: null,
    imagePrompt: null,
    error: msg,
  }, { status });
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BotRequest;

    if (!body.action) {
      return errorResponse("Missing 'action' field. Must be one of: create_character, start_game, player_action, get_state");
    }

    switch (body.action) {
      case "create_character":
        return handleCreateCharacter(body);
      case "start_game":
        return handleStartGame(body);
      case "player_action":
        return handlePlayerAction(body);
      case "get_state":
        return handleGetState(body);
      default:
        return errorResponse(`Unknown action: ${body.action}. Must be one of: create_character, start_game, player_action, get_state`);
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(errMsg, 500);
  }
}

function handleCreateCharacter(body: BotRequest): NextResponse<BotResponse> {
  if (!body.character) {
    return errorResponse("Missing 'character' field for create_character action");
  }

  const c = body.character;
  if (!c.name || !c.race || !c.class || !c.gender || !c.abilityScores) {
    return errorResponse("character must include: name, race, class, gender, abilityScores");
  }

  const character = buildCharacter({
    name: c.name as string,
    gender: c.gender as string,
    race: c.race as string,
    class: c.class as string,
    abilityScores: c.abilityScores as AbilityScores,
    skillProficiencies: (c.skillProficiencies as string[]) ?? [],
    cantrips: (c.cantrips as string[]) ?? [],
    spells: (c.spells as string[]) ?? [],
    fightingStyle: c.fightingStyle as string | undefined,
    campaignTheme: c.campaignTheme as string | undefined,
  });

  const gameState = {
    character,
    location: "Unknown",
    questLog: [] as string[],
    turnCount: 0,
    history: [] as { role: "user" | "assistant"; content: string }[],
  };

  return NextResponse.json({
    success: true,
    gameState,
    dmResponse: null,
    checkRoll: null,
    imagePrompt: null,
    error: null,
  });
}

async function handleStartGame(body: BotRequest): Promise<NextResponse<BotResponse>> {
  if (!body.gameState) {
    return errorResponse("Missing 'gameState' field for start_game action");
  }

  const gs = body.gameState;
  const character = gs.character;

  // Determine campaign and starting location
  const campaignThemeStr = (character.campaignTheme ?? getRandomThemeForLevel(character.level)) as string;
  const campaign = getRandomCampaign(campaignThemeStr as CampaignTheme);
  gs.location = campaign.startLocation;
  gs.turnCount = 1;

  const startMessage = "[SYSTEM: New game started. Introduce the setting, the player's surroundings, and give them a quest hook.]";

  return runDMPipeline(gs, character, startMessage, campaignThemeStr);
}

async function handlePlayerAction(body: BotRequest): Promise<NextResponse<BotResponse>> {
  if (!body.gameState) {
    return errorResponse("Missing 'gameState' field for player_action action");
  }
  if (!body.message) {
    return errorResponse("Missing 'message' field for player_action action");
  }

  const gs = body.gameState;
  const character = gs.character;
  gs.turnCount += 1;

  // Add player message to history
  gs.history.push({ role: "user", content: body.message });

  const campaignThemeStr = (character.campaignTheme ?? getRandomThemeForLevel(character.level)) as string;

  return runDMPipeline(gs, character, body.message, campaignThemeStr);
}

function handleGetState(body: BotRequest): NextResponse<BotResponse> {
  if (!body.gameState) {
    return errorResponse("Missing 'gameState' field for get_state action");
  }

  return NextResponse.json({
    success: true,
    gameState: body.gameState,
    dmResponse: null,
    checkRoll: null,
    imagePrompt: null,
    error: null,
  });
}

// ── DM pipeline (same as /api/dm) ───────────────────────────────

async function runDMPipeline(
  gs: BotRequest["gameState"] & object,
  character: Character,
  message: string,
  campaignThemeStr: string,
): Promise<NextResponse<BotResponse>> {
  const gameState: Pick<GameState, "location" | "questLog" | "turnCount"> = {
    location: gs.location,
    questLog: gs.questLog,
    turnCount: gs.turnCount,
  };

  const pipelineInput: PipelineInput = {
    playerAction: message,
    character,
    gameState,
    chatHistory: gs.history ?? [],
    facts: [],
    events: [],
    npcs: [],
    locations: [],
    karma: character.karma ?? 0,
    groundItems: [],
  };

  const preResult = preGenerate(pipelineInput);

  const systemPrompt = buildSystemPrompt(character, gameState, undefined, undefined, campaignThemeStr);

  let narrative = "";
  let sceneImagePrompt: string | undefined;
  let checkRequired: { stat: string; skill: string; dc: number; description: string } | undefined;

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

  const { text: rawText } = await callWithCascade(messages);
  const parsed = parseDMResponse(rawText);
  narrative = parsed.narrative;
  sceneImagePrompt = parsed.sceneImagePrompt;
  checkRequired = parsed.checkRequired;

  const postResult = postGenerate(narrative, pipelineInput, preResult);
  narrative = postResult.narrative;

  // Apply engine outcome to character state
  const eo = preResult.engineOutcome;
  if (eo.hpChange) character.hp = Math.max(0, Math.min(character.maxHp, character.hp + eo.hpChange));
  if (eo.itemsGained.length > 0) character.inventory.push(...eo.itemsGained);
  if (eo.itemsLost.length > 0) {
    for (const item of eo.itemsLost) {
      const idx = character.inventory.indexOf(item);
      if (idx !== -1) character.inventory.splice(idx, 1);
    }
  }
  if (eo.goldChange) character.gold += eo.goldChange;
  if (eo.xpGained) character.xp += eo.xpGained;
  if (eo.locationChange) gs.location = eo.locationChange;
  if (eo.newQuest && !gs.questLog.includes(eo.newQuest)) gs.questLog.push(eo.newQuest);
  if (eo.completeQuest) gs.questLog = gs.questLog.filter(q => q !== eo.completeQuest);

  // Add DM response to history
  gs.history.push({ role: "assistant", content: narrative });

  // Update character in gameState
  gs.character = character;

  return NextResponse.json({
    success: true,
    gameState: gs,
    dmResponse: narrative,
    checkRoll: checkRequired ? { stat: checkRequired.stat, skill: checkRequired.skill, dc: checkRequired.dc } : null,
    imagePrompt: sceneImagePrompt ?? null,
    error: null,
  });
}
