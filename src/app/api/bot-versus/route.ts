import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt, buildEngineContextMessage } from "@/lib/ai/dm-prompt";
import {
  parseDMResponse, checkLocationStagnation, checkItemAcquisition,
  enforceGameState,
} from "@/lib/ai/parse-response";
import { getNextEscalation, type DangerContext } from "@/lib/progression-engine";
import { preGenerate, postGenerate } from "@/lib/engine/pipeline";
import type { PipelineInput } from "@/lib/engine/pipeline";
import { getRandomThemeForLevel, getRandomCampaign } from "@/lib/campaigns";
import type { CampaignTheme } from "@/lib/campaigns";
import type { Character, CharacterClass, Race, AbilityScores } from "@/types/character";
import type { GameState } from "@/types/game";
import { getItemInfo } from "@/lib/items";
import { RACIAL_DATA, applyRacialBonuses } from "@/lib/races";
import { buildResourcePool } from "@/lib/resources";
import {
  getProxyFetch, callWithCascade, isRetryableError, sleep,
} from "@/lib/ai/providers";
import { initCombat, resolveCombatTurn } from "@/lib/combat-engine";
import type { CombatState, CombatRoundResult } from "@/lib/combat-engine";

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

const GROK_MODEL_PRIMARY = "grok-4-1-fast-non-reasoning";
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

const STARTING_EQUIPMENT: Record<string, { worn: string[]; backpack: string[] }> = {
  Barbarian: {
    worn: ["Greataxe", "Handaxe", "Handaxe"],
    backpack: ["Backpack", "Waterskin", "Rations x4", "Torch x4", "Explorer's Pack"],
  },
  Bard: {
    worn: ["Rapier", "Leather Armor", "Lute"],
    backpack: ["Dagger", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Diplomat's Pack"],
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
    backpack: ["Light Crossbow", "Bolt x20", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Dungeoneer's Pack"],
  },
  Monk: {
    worn: ["Shortsword"],
    backpack: ["Dart x10", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Dungeoneer's Pack"],
  },
  Paladin: {
    worn: ["Longsword", "Chain Mail", "Shield", "Holy Symbol"],
    backpack: ["Javelin x5", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Priest's Pack"],
  },
  Ranger: {
    worn: ["Longbow", "Leather Armor", "Shortsword", "Shortsword"],
    backpack: ["Quiver with 20 Arrows", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Explorer's Pack"],
  },
  Rogue: {
    worn: ["Shortsword", "Leather Armor", "Shortbow", "Thieves' Tools"],
    backpack: ["Dagger", "Dagger", "Quiver with 20 Arrows", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Burglar's Pack"],
  },
  Sorcerer: {
    worn: ["Dagger", "Arcane Focus"],
    backpack: ["Light Crossbow", "Bolt x20", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Dungeoneer's Pack"],
  },
  Warlock: {
    worn: ["Dagger", "Leather Armor", "Arcane Focus"],
    backpack: ["Light Crossbow", "Bolt x20", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Scholar's Pack"],
  },
  Wizard: {
    worn: ["Quarterstaff", "Arcane Focus"],
    backpack: ["Spellbook", "Backpack", "Waterskin", "Rations x4", "Torch x4", "Scholar's Pack"],
  },
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
  const gear = STARTING_EQUIPMENT[cls] ?? STARTING_EQUIPMENT.Fighter;
  const equipped = [...gear.worn];
  const inventory = [...gear.worn, ...gear.backpack];
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
  turnsSinceCombat: number;
  turnsSinceLastEscalation: number;
  recentFailedChecks: number;
  recentDMResponses: string[];
  turnsSinceLoot: number;
  successfulChecksSinceLoot: number;
  combatActive: boolean;
  combatState: CombatState | null;
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

  // ── Resolve active combat BEFORE LLM call ──────────────────────
  let preCombatResult: CombatRoundResult | null = null;
  if (gs.combatState?.active) {
    preCombatResult = resolveCombatTurn(message, gs.character, gs.combatState);
    gs.combatState = preCombatResult.combatState;
    gs.character.hp = Math.max(0, gs.character.hp + preCombatResult.playerHpChange);

    // Inject combat results into engine outcome so LLM can narrate them
    const eo = preResult.engineOutcome;
    eo.hpChange = (eo.hpChange || 0) + preCombatResult.playerHpChange;
    eo.damageDealt = preCombatResult.playerDamage;
    eo.isCriticalHit = preCombatResult.diceBreakdown.playerAttackRoll?.crit ?? false;
    eo.damageTaken = preCombatResult.enemyDamage > 0 ? preCombatResult.enemyDamage : undefined;

    if (preCombatResult.combatEndReason === "enemy_killed") {
      eo.xpGained = (eo.xpGained || 0) + preCombatResult.xpAwarded;
      eo.goldChange = (eo.goldChange || 0) + preCombatResult.goldDropped;
      if (preCombatResult.itemsDropped.length > 0) {
        eo.itemsGained.push(...preCombatResult.itemsDropped);
      }
    }

    if (preCombatResult.combatOver) {
      console.log(`[bot-versus] COMBAT ENDED (pre-LLM): ${preCombatResult.combatEndReason}`);
      if (preCombatResult.combatEndReason === "enemy_killed") {
        gs.character.xp += preCombatResult.xpAwarded;
        gs.character.gold += preCombatResult.goldDropped;
        gs.character.inventory.push(...preCombatResult.itemsDropped);
      }
      gs.combatState = null;
      gs.combatActive = false;
    }
  }

  const systemPrompt = buildSystemPrompt(gs.character, gameState, undefined, undefined, campaignTheme);
  const engineContext = buildEngineContextMessage(message, preResult.engineOutcome, preResult.formattedContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...gs.history.slice(-10).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "system", content: engineContext },
    { role: "user", content: message },
  ];

  // Inject combat round context so the LLM can narrate around the mechanical outcome
  if (preCombatResult) {
    messages.push({
      role: "system",
      content: `## Combat Round Result\n${preCombatResult.narrative}${preCombatResult.combatOver ? `\nCOMBAT ENDED: ${preCombatResult.combatEndReason}.${preCombatResult.lootNarrative ? ` ${preCombatResult.lootNarrative}` : ""}` : `\nEnemy HP: ${preCombatResult.combatState.enemyHp}/${preCombatResult.combatState.enemyMaxHp}`}\nNarrate this combat round. Use the dice results above exactly.`,
    });
  }

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
  const backpackBefore = [...gs.character.inventory];

  // Centralized state enforcement — all 4 fixes applied here
  const enforced = enforceGameState(parsed, {
    hp: gs.character.hp,
    maxHp: gs.character.maxHp,
    xp: gs.character.xp,
    gold: gs.character.gold,
    location: gs.location,
    inventory: gs.character.inventory,
  }, {
    hpChange: eo.hpChange,
    goldChange: eo.goldChange,
    xpGained: eo.xpGained,
    locationChange: eo.locationChange,
    itemsGained: eo.itemsGained,
    itemsLost: eo.itemsLost,
    roll: eo.roll,
  }, rawText);

  // Apply enforced state
  gs.character.hp = enforced.hp;
  gs.character.xp = enforced.xp;
  gs.character.gold = enforced.gold;
  gs.location = enforced.location;
  gs.character.inventory = enforced.inventory;
  let finalNarrative = enforced.narrative;

  // Log enforcement warnings
  for (const w of enforced.warnings) {
    console.warn(`[parse-response] ${w}`);
  }

  // ── Location extraction from movement phrases ──────────────────
  const MOVEMENT_REGEX = /(?:you\s+arrive\s+at|you\s+enter|you\s+reach|you\s+step\s+into|you\s+emerge|you\s+find\s+yourself\s+in|you\s+make\s+your\s+way\s+to)\s+(?:the\s+)?(.{3,60}?)(?:\.|,|!|\?|$)/i;
  if (!eo.locationChange) {
    const movementMatch = finalNarrative.match(MOVEMENT_REGEX);
    if (movementMatch) {
      const extracted = movementMatch[1].trim();
      if (extracted) {
        gs.location = extracted;
        console.log(`[bot-versus] Location extracted from narrative: "${extracted}"`);
      }
    }
  }

  // ── Track failed and successful checks ──────────────────────────
  if (eo.roll) {
    if (!eo.roll.success) {
      gs.recentFailedChecks++;
    } else {
      gs.successfulChecksSinceLoot++;
    }
  }

  // ── Track combat state from parsed tags ─────────────────────────
  if (parsed.parsedState.combatStart) {
    gs.combatActive = true;
  }
  if (/\b(?:defeated|slain|killed|fled|escaped|retreated)\b/i.test(finalNarrative) && !parsed.parsedState.combatStart) {
    gs.combatActive = false;
  }

  // ── Progression engine: getNextEscalation ──────────────────────
  // Skip escalation entirely on turn 1 — opening turn is world introduction only
  if (gs.turnCount <= 1) {
    gs.turnsSinceCombat++;
    gs.turnsSinceLastEscalation++;
    gs.turnsSinceLoot++;

    // ── Update recent DM response buffer (keep last 3) ─────────────
    gs.recentDMResponses.unshift(finalNarrative);
    if (gs.recentDMResponses.length > 3) gs.recentDMResponses.length = 3;

    // Apply quest changes
    if (eo.newQuest && !gs.questLog.includes(eo.newQuest)) gs.questLog.push(eo.newQuest);
    if (eo.completeQuest) gs.questLog = gs.questLog.filter(q => q !== eo.completeQuest);

    gs.history.push({ role: "assistant", content: finalNarrative });
    checkLocationStagnation(gs.location);
    checkItemAcquisition(finalNarrative, backpackBefore, gs.character.inventory);

    return { narrative: finalNarrative, checkRoll: parsed.checkRequired ? { stat: parsed.checkRequired.stat, skill: parsed.checkRequired.skill, dc: parsed.checkRequired.dc, description: parsed.checkRequired.description } : null, imagePrompt: parsed.sceneImagePrompt ?? null, provider, tagsFound, rawResponse: rawText };
  }

  const dangerCtx: DangerContext = {
    location: gs.location,
    campaignTheme,
    turnsSinceCombat: gs.turnsSinceCombat,
    turnsSinceCheck: 0,
    turnsSinceLastEscalation: gs.turnsSinceLastEscalation,
    recentFailedChecks: gs.recentFailedChecks,
    playerHpPercent: gs.character.maxHp > 0 ? gs.character.hp / gs.character.maxHp : 1,
    playerLevel: gs.character.level,
    narrativeHints: gs.recentDMResponses,
    recentDMResponses: gs.recentDMResponses,
    combatActive: gs.combatActive,
    turnsSinceLoot: gs.turnsSinceLoot,
    successfulChecksSinceLoot: gs.successfulChecksSinceLoot,
  };

  const escalation = getNextEscalation(dangerCtx);
  console.log(`[bot-versus] PROGRESSION turn=${gs.turnCount} danger=${dangerCtx.turnsSinceCombat} escalation=${escalation.type}`);

  if (escalation.type === "combat" && escalation.combatStartTag) {
    finalNarrative = finalNarrative + "\n\n" + escalation.narrativeInjection
      + "\n[COMBAT_START] " + escalation.combatStartTag;
    gs.turnsSinceCombat = 0;
    gs.turnsSinceLastEscalation = 0;
    gs.recentFailedChecks = 0;
    gs.combatActive = true;
    tagsFound.push("COMBAT_START");
  } else if (escalation.type === "loot") {
    finalNarrative = finalNarrative + "\n\n" + escalation.narrativeInjection;
    gs.turnsSinceLastEscalation = 0;
    gs.turnsSinceLoot = 0;
    gs.successfulChecksSinceLoot = 0;
    // Award loot: 5-15 gold + one random common item
    const lootGold = Math.floor(Math.random() * 11) + 5;
    gs.character.gold += lootGold;
    const COMMON_LOOT = ["Healing Potion", "Antitoxin", "Rope", "Torch", "Rations (1 day)", "Caltrops"];
    const lootItem = COMMON_LOOT[Math.floor(Math.random() * COMMON_LOOT.length)];
    gs.character.inventory.push(lootItem);
    console.log(`[bot-versus] LOOT awarded: ${lootGold} gold + ${lootItem}`);
  } else if (escalation.type === "tension" || escalation.type === "revelation" || escalation.type === "environment") {
    finalNarrative = finalNarrative + "\n\n" + escalation.narrativeInjection;
    gs.turnsSinceLastEscalation = 0;
    gs.recentFailedChecks = 0;
  } else {
    // type === "none"
    gs.turnsSinceCombat++;
    gs.turnsSinceLastEscalation++;
    gs.turnsSinceLoot++;
  }

  // ── Wire COMBAT_START to combat engine ──────────────────────────
  const combatStartMatch = finalNarrative.match(/\[COMBAT_START\]\s*(.+?)$/m);
  if (combatStartMatch && !gs.combatState) {
    const newCombat = initCombat(combatStartMatch[1].trim(), gs.character);
    if (newCombat) {
      gs.combatState = newCombat;
      gs.combatActive = true;
      console.log(`[bot-versus] COMBAT INITIATED: ${newCombat.enemyName} HP:${newCombat.enemyHp} AC:${newCombat.enemyAc}`);
    }
    // Strip the COMBAT_START tag from narrative shown to player
    finalNarrative = finalNarrative.replace(/\[COMBAT_START\][^\n]*/g, "").trim();
  }

  // ── Resolve newly-initiated combat round (from COMBAT_START this turn only) ──
  // Pre-existing combat was already resolved before the LLM call above.
  if (gs.combatState?.active && !preCombatResult) {
    const combatResult: CombatRoundResult = resolveCombatTurn(message, gs.character, gs.combatState);
    gs.combatState = combatResult.combatState;
    gs.character.hp = Math.max(0, gs.character.hp + combatResult.playerHpChange);

    // Append combat round narrative
    finalNarrative = finalNarrative + "\n\n" + combatResult.narrative;
    if (!tagsFound.includes("COMBAT_ROUND")) tagsFound.push("COMBAT_ROUND");

    if (combatResult.combatOver) {
      console.log(`[bot-versus] COMBAT ENDED: ${combatResult.combatEndReason}`);
      if (combatResult.combatEndReason === "enemy_killed") {
        gs.character.xp += combatResult.xpAwarded;
        gs.character.gold += combatResult.goldDropped;
        gs.character.inventory.push(...combatResult.itemsDropped);
        if (combatResult.lootNarrative) {
          finalNarrative += "\n" + combatResult.lootNarrative;
        }
      }
      gs.combatState = null;
      gs.combatActive = false;
    }
  }

  // Append pre-LLM combat result narrative to the final output
  if (preCombatResult) {
    finalNarrative = finalNarrative + "\n\n" + preCombatResult.narrative;
    if (!tagsFound.includes("COMBAT_ROUND")) tagsFound.push("COMBAT_ROUND");
    if (preCombatResult.lootNarrative) {
      finalNarrative += "\n" + preCombatResult.lootNarrative;
    }
  }

  // ── Update recent DM response buffer (keep last 3) ─────────────
  gs.recentDMResponses.unshift(finalNarrative);
  if (gs.recentDMResponses.length > 3) gs.recentDMResponses.length = 3;

  // Apply quest changes (not part of enforcement)
  if (eo.newQuest && !gs.questLog.includes(eo.newQuest)) gs.questLog.push(eo.newQuest);
  if (eo.completeQuest) gs.questLog = gs.questLog.filter(q => q !== eo.completeQuest);

  gs.history.push({ role: "assistant", content: finalNarrative });

  // Track location stagnation
  checkLocationStagnation(gs.location);

  // Warn if narrative mentions item acquisition but inventory didn't change
  checkItemAcquisition(finalNarrative, backpackBefore, gs.character.inventory);

  return { narrative: finalNarrative, checkRoll: parsed.checkRequired ? { stat: parsed.checkRequired.stat, skill: parsed.checkRequired.skill, dc: parsed.checkRequired.dc, description: parsed.checkRequired.description } : null, imagePrompt: parsed.sceneImagePrompt ?? null, provider, tagsFound, rawResponse: rawText };
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

const REASONING_MODELS = ["grok-4-fast-reasoning", "grok-4-1-fast-reasoning"];

async function callGrokWithModel(
  grokClient: OpenAI,
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  const isReasoning = REASONING_MODELS.some(m => model.includes(m));
  const response = await grokClient.chat.completions.create({
    model,
    messages,
    // Reasoning models require max_completion_tokens (covers thinking + output).
    // Non-reasoning models use max_tokens.
    ...(isReasoning ? { max_completion_tokens: 512 } : { max_tokens: 512 }),
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
    turnsSinceCombat: 0, turnsSinceLastEscalation: 0, recentFailedChecks: 0, recentDMResponses: [],
    turnsSinceLoot: 0, successfulChecksSinceLoot: 0, combatActive: false, combatState: null,
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
      combatEncounters: turns.filter(t =>
        t.dm.tagsFound.includes("COMBAT_START") ||
        t.dm.tagsFound.includes("COMBAT_ROUND") ||
        /\[COMBAT_START\]/i.test(t.dm.rawResponse)
      ).length,
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
  try {
    return await runVersus();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bot-versus] Fatal error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    return await runVersus();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bot-versus] Fatal error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
