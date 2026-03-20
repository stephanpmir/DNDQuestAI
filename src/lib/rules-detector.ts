/**
 * Rules Question Detector — detects when a player is asking about game mechanics
 * rather than taking an in-game action, and returns plain English answers.
 */

import type { Character } from "@/types/character";
import { RULES_DATABASE } from "@/lib/rules-reference";
import type { RulesEntry } from "@/lib/rules-reference";

// ── Question detection patterns ──────────────────────────────────

/** Patterns that indicate a rules question rather than an action */
const QUESTION_PATTERNS: RegExp[] = [
  /\bhow\s+(?:does|do|can|would|should|many|much)\b/i,
  /\bwhat\s+(?:is|are|does|do|happens|would|can)\b/i,
  /\bwhat's\s+(?:the|my|a|an)\b/i,
  /\bcan\s+(?:i|my|a|an|the)\b/i,
  /\bexplain\b/i,
  /\bremind\s+me\b/i,
  /\bwhat\s+are\s+the\s+rules\b/i,
  /\bhow\s+(?:many|much)\b/i,
  /\bis\s+(?:it|that|this)\s+(?:allowed|possible|legal)\b/i,
  /\bwhat's\s+the\s+difference\b/i,
  /\btell\s+me\s+(?:about|how)\b/i,
  /\bdo\s+i\s+(?:get|have|need|add|roll)\b/i,
  /\bwhen\s+(?:can|do|does|should)\s+i\b/i,
];

/** Direct mechanic name mentions ending in a question mark */
const MECHANIC_QUESTION_PATTERN = /^[^.!]{3,60}\?$/;

/** Known mechanic keywords for short-query detection */
const MECHANIC_KEYWORDS: string[] = [
  "sneak attack", "sneak", "attack", "dodge", "disengage", "dash",
  "grapple", "shove", "opportunity", "initiative", "surprise",
  "advantage", "disadvantage", "concentration", "spell slot", "cantrip",
  "bonus action", "reaction", "prone", "restrained", "grappled",
  "paralyzed", "stunned", "charmed", "frightened", "blinded",
  "unconscious", "death save", "rage", "ki", "bardic", "smite", "hex",
  "wild shape", "channel divinity", "second wind", "action surge",
  "extra attack", "lay on hands", "arcane recovery", "metamagic",
  "sorcery point",
];

/** Keywords that indicate an in-game action even if phrased as a question */
const ACTION_OVERRIDE_PATTERNS: RegExp[] = [
  /\bi\s+(?:attack|strike|hit|swing|stab|slash|cast|throw|shoot|grab|pick up|drop|buy|sell|use|drink|eat|equip|wear|rest|sleep|sneak|hide|climb|swim|jump|run|walk|go|move|head|travel|enter|explore|search|investigate|talk|speak|ask|say|greet)\b/i,
  /\blet(?:'s| me| us)\b/i,
  /\bi\s+want\s+to\b/i,
  /\bi'll\b/i,
  /\bi\s+try\s+to\b/i,
];

/**
 * Detect whether the player input is asking about game mechanics
 * rather than taking an in-game action.
 */
export function detectRulesQuestion(playerInput: string): boolean {
  const trimmed = playerInput.trim();
  if (trimmed.length < 5) return false;

  // Exclude in-game actions phrased as questions ("can I attack the goblin?")
  if (ACTION_OVERRIDE_PATTERNS.some(p => p.test(trimmed))) {
    // If it matches an action pattern AND a rules pattern, check if it's
    // truly about mechanics by looking for mechanic keywords
    const hasMechanicKeyword = RULES_DATABASE.some(entry =>
      entry.keywords.some(kw => trimmed.toLowerCase().includes(kw.toLowerCase()))
    );
    const hasQuestionPattern = QUESTION_PATTERNS.some(p => p.test(trimmed));
    // Only treat as rules question if it's clearly asking about a rule, not taking action
    if (!hasMechanicKeyword || !hasQuestionPattern) return false;
    // If both, check if there's a concrete target (goblin, door, etc.) — that's an action
    if (/\b(?:the|a|an)\s+\w+(?:s)?\b/i.test(trimmed) && /\b(?:goblin|door|chest|guard|enemy|monster|creature|wolf|skeleton)\b/i.test(trimmed)) {
      return false;
    }
  }

  // Check explicit question patterns
  if (QUESTION_PATTERNS.some(p => p.test(trimmed))) {
    // Verify at least one mechanic keyword is present
    return RULES_DATABASE.some(entry =>
      entry.keywords.some(kw => trimmed.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  // Direct mechanic mention ending in "?"
  if (MECHANIC_QUESTION_PATTERN.test(trimmed)) {
    return RULES_DATABASE.some(entry =>
      entry.keywords.some(kw => trimmed.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  const lower = trimmed.toLowerCase();
  const hasMechanicKw = MECHANIC_KEYWORDS.some(kw => lower.includes(kw));

  // Short informal queries (6 words or fewer) with a mechanic keyword
  if (hasMechanicKw) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 6) return true;
  }

  // Any input ending with "?" that contains a mechanic keyword
  if (trimmed.endsWith("?") && hasMechanicKw) {
    return true;
  }

  return false;
}

// ── Keyword matching and scoring ─────────────────────────────────

interface ScoredEntry {
  entry: RulesEntry;
  score: number;
}

function scoreEntry(entry: RulesEntry, input: string): number {
  const lower = input.toLowerCase();
  let score = 0;

  for (const keyword of entry.keywords) {
    const kwLower = keyword.toLowerCase();
    if (lower.includes(kwLower)) {
      // Longer keyword matches are more specific and score higher
      score += kwLower.length;
      // Exact word boundary match scores even higher
      const wordPattern = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (wordPattern.test(input)) {
        score += kwLower.length;
      }
    }
  }

  // Boost if the entry title appears in the input
  if (lower.includes(entry.title.toLowerCase())) {
    score += 20;
  }

  return score;
}

/**
 * Find the best matching rules entry for the given input.
 * Returns the top match or null if nothing scores above 0.
 */
function findBestEntry(playerInput: string): RulesEntry | null {
  const scored: ScoredEntry[] = RULES_DATABASE
    .map(entry => ({ entry, score: scoreEntry(entry, playerInput) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].entry : null;
}

// ── Character personalization ────────────────────────────────────

const SNEAK_ATTACK_DICE: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5,
  11: 6, 12: 6, 13: 7, 14: 7, 15: 8, 16: 8, 17: 9, 18: 9, 19: 10, 20: 10,
};

const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2],
  6: [4, 3, 3], 7: [4, 3, 3, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2], 11: [4, 3, 3, 3, 2, 1], 12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1], 14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1], 18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2],
  6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2],
  10: [4, 3, 2], 11: [4, 3, 3], 12: [4, 3, 3],
  13: [4, 3, 3, 1], 14: [4, 3, 3, 1], 15: [4, 3, 3, 2],
  16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2],
};

const WARLOCK_SLOTS: Record<number, { count: number; level: number }> = {
  1: { count: 1, level: 1 }, 2: { count: 2, level: 1 }, 3: { count: 2, level: 2 },
  4: { count: 2, level: 2 }, 5: { count: 2, level: 3 }, 6: { count: 2, level: 3 },
  7: { count: 2, level: 4 }, 8: { count: 2, level: 4 }, 9: { count: 2, level: 5 },
  10: { count: 2, level: 5 }, 11: { count: 3, level: 5 }, 12: { count: 3, level: 5 },
  13: { count: 3, level: 5 }, 14: { count: 3, level: 5 }, 15: { count: 3, level: 5 },
  16: { count: 3, level: 5 }, 17: { count: 4, level: 5 }, 18: { count: 4, level: 5 },
  19: { count: 4, level: 5 }, 20: { count: 4, level: 5 },
};

const FULL_CASTERS = ["Wizard", "Cleric", "Druid", "Bard", "Sorcerer"];
const HALF_CASTERS = ["Paladin", "Ranger"];

function personalizeAnswer(answer: string, entry: RulesEntry, character: Character): string {
  let personalized = answer;

  // Sneak Attack personalization for Rogues
  if (entry.title.includes("Sneak Attack") && character.class === "Rogue") {
    const dice = SNEAK_ATTACK_DICE[character.level] ?? 1;
    personalized += `\n\nAs a level ${character.level} Rogue, your Sneak Attack deals ${dice}d6 extra damage.`;
  }

  // Spell slots personalization for casters
  if (entry.title.includes("Spell Slots")) {
    if (FULL_CASTERS.includes(character.class)) {
      const slots = FULL_CASTER_SLOTS[character.level];
      if (slots) {
        const slotStr = slots.map((count, i) => `${count} × level ${i + 1}`).join(", ");
        personalized += `\n\nAs a level ${character.level} ${character.class}, your spell slots are: ${slotStr}.`;
      }
    } else if (HALF_CASTERS.includes(character.class)) {
      const slots = HALF_CASTER_SLOTS[character.level];
      if (slots && slots.length > 0) {
        const slotStr = slots.map((count, i) => `${count} × level ${i + 1}`).join(", ");
        personalized += `\n\nAs a level ${character.level} ${character.class}, your spell slots are: ${slotStr}.`;
      } else if (character.level < 2) {
        personalized += `\n\nAs a level 1 ${character.class}, you don't have spell slots yet — you gain spellcasting at level 2.`;
      }
    } else if (character.class === "Warlock") {
      const warlockInfo = WARLOCK_SLOTS[character.level];
      if (warlockInfo) {
        personalized += `\n\nAs a level ${character.level} Warlock, you have ${warlockInfo.count} spell slot(s) at level ${warlockInfo.level}. They recharge on a short rest.`;
      }
    }
  }

  // Rage personalization for Barbarians
  if (entry.title.includes("Rage") && character.class === "Barbarian") {
    const rageBonus = character.level >= 16 ? 4 : character.level >= 9 ? 3 : 2;
    const rageCount = character.level >= 17 ? "unlimited" : character.level >= 12 ? "5" : character.level >= 6 ? "4" : character.level >= 3 ? "3" : "2";
    personalized += `\n\nAt level ${character.level}, your rage bonus damage is +${rageBonus} and you can rage ${rageCount} times per long rest.`;
    if (character.raging) {
      personalized += " You are currently raging.";
    }
  }

  // Martial Arts die for Monks
  if (entry.title.includes("Martial Arts") && character.class === "Monk") {
    const martialDie = character.level >= 17 ? "d10" : character.level >= 11 ? "d8" : character.level >= 5 ? "d6" : "d4";
    const ki = character.level;
    personalized += `\n\nAt level ${character.level}, your Martial Arts die is ${martialDie} and you have ${ki} Ki points.`;
  }

  // Ki personalization for Monks
  if (entry.title.includes("Ki") && character.class === "Monk") {
    personalized += `\n\nAt level ${character.level}, you have ${character.level} Ki points.`;
    if (character.level >= 5) {
      personalized += " You can use Stunning Strike.";
    }
  }

  // Bardic Inspiration die for Bards
  if (entry.title.includes("Bardic Inspiration") && character.class === "Bard") {
    const die = character.level >= 15 ? "d12" : character.level >= 10 ? "d10" : character.level >= 5 ? "d8" : "d6";
    const chaMod = Math.floor((character.abilityScores.charisma - 10) / 2);
    const uses = Math.max(1, chaMod);
    personalized += `\n\nAt level ${character.level}, your Inspiration die is ${die}. You can use it ${uses} time(s) per ${character.level >= 5 ? "short or long rest" : "long rest"}.`;
  }

  // Action Surge for Fighters
  if (entry.title.includes("Action Surge") && character.class === "Fighter") {
    const uses = character.level >= 17 ? 2 : 1;
    personalized += `\n\nAt level ${character.level}, you can use Action Surge ${uses} time(s) per short rest.`;
    if (character.level >= 5) {
      personalized += " Combined with Extra Attack, that's 4 attacks in one turn.";
    }
  }

  // Second Wind for Fighters
  if (entry.title.includes("Second Wind") && character.class === "Fighter") {
    personalized += `\n\nAt level ${character.level}, Second Wind heals 1d10+${character.level} HP.`;
  }

  // Divine Smite for Paladins
  if (entry.title.includes("Divine Smite") && character.class === "Paladin") {
    const slots = HALF_CASTER_SLOTS[character.level];
    if (slots && slots.length > 0) {
      const maxLevel = slots.length;
      const maxDice = Math.min(5, 2 + (maxLevel - 1));
      personalized += `\n\nAt level ${character.level}, your highest available smite deals ${maxDice}d8 radiant damage (${maxDice + 1}d8 vs undead/fiends).`;
    }
  }

  // Lay on Hands for Paladins
  if (entry.title.includes("Lay on Hands") && character.class === "Paladin") {
    const pool = 5 * character.level;
    personalized += `\n\nAt level ${character.level}, your Lay on Hands pool is ${pool} HP.`;
  }

  // Arcane Recovery for Wizards
  if (entry.title.includes("Arcane Recovery") && character.class === "Wizard") {
    const recoverLevels = Math.ceil(character.level / 2);
    personalized += `\n\nAt level ${character.level}, you can recover slots totaling up to ${recoverLevels} combined spell levels.`;
  }

  // Wild Shape for Druids
  if (entry.title.includes("Wild Shape") && character.class === "Druid") {
    const maxCR = character.level >= 8 ? 1 : character.level >= 4 ? 0.5 : 0.25;
    const swim = character.level >= 4;
    const fly = character.level >= 8;
    personalized += `\n\nAt level ${character.level}, you can transform into beasts up to CR ${maxCR}${swim ? ", with swimming speed" : ""}${fly ? " and flying speed" : ""}.`;
  }

  // Metamagic for Sorcerers
  if (entry.title.includes("Metamagic") && character.class === "Sorcerer") {
    personalized += `\n\nAt level ${character.level}, you have ${character.level} Sorcery Points per long rest.`;
  }

  // Proficiency bonus context
  if (entry.category === "combat_mechanic" || entry.category === "combat_action") {
    const prof = Math.floor((character.level - 1) / 4) + 2;
    personalized += `\n\nYour proficiency bonus is +${prof}.`;
  }

  return personalized;
}

/**
 * Look up the most relevant rules entry and return a plain English answer
 * personalized to the character where relevant.
 */
export function getRulesAnswer(playerInput: string, character: Character): string {
  const entry = findBestEntry(playerInput);
  if (!entry) {
    return "I'm not sure which rule you're asking about. Try asking about a specific mechanic like \"How does Sneak Attack work?\" or \"What does the poisoned condition do?\"";
  }

  return personalizeAnswer(entry.answer, entry, character);
}
