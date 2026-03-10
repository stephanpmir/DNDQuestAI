import type { Character } from "@/types/character";
import type { EngineOutcome, WorldEvent } from "@/types/world";
import { abilityCheck, attackRoll, damageRoll, modifier, d20 } from "./dice";

/** Action categories the engine can detect from player input. */
type ActionType =
  | "attack"
  | "cast_spell"
  | "skill_check"
  | "explore"
  | "talk"
  | "rest"
  | "trade"
  | "use_item"
  | "self_harm"
  | "death_save"
  | "unknown";

/** Keywords that map to action types — ORDER MATTERS: more specific patterns first */
const ACTION_PATTERNS: [RegExp, ActionType][] = [
  [/\b(attack|strike|hit|fight|slash|stab|shoot|swing)\b/i, "attack"],
  [/\b(cast|spell|magic|fireball|heal|cure)\b/i, "cast_spell"],
  [/\b(pick lock|sneak|hide|stealth|climb|swim|jump|search|investigate|persuade|intimidate|deceive|perception|check)\b/i, "skill_check"],
  [/\b(rest|sleep|camp|long rest|short rest)\b/i, "rest"],
  [/\b(talk|speak|ask|greet|negotiate|converse|say)\b/i, "talk"],
  [/\b(buy|sell|trade|shop|purchase|barter)\b/i, "trade"],
  [/\b(use|drink|eat|equip|open|read)\b/i, "use_item"],
  [/\b(explore|look around|examine|enter|go to|travel|move|walk|head)\b/i, "explore"],
];

/** Patterns that indicate self-harm or dangerous self-targeted actions */
const SELF_HARM_PATTERNS = [
  /\b(?:set (?:myself|me|my) on fire|burn myself|light myself)\b/i,
  /\b(?:drink|consume|ingest)\s+(?:the\s+)?(?:poison|venom|acid|lava)\b/i,
  /\b(?:stab|cut|hurt|harm|attack|hit)\s+(?:myself|me)\b/i,
  /\b(?:jump off|leap off|throw myself|jump into)\s+(?:the\s+)?(?:cliff|lava|fire|pit|void|abyss)\b/i,
];

/** Minimum turns between rests to prevent rest abuse */
const MIN_TURNS_BETWEEN_RESTS = 5;

function detectAction(playerInput: string, character: Character): ActionType {
  // If character is unconscious at 0 HP, force death save
  if (character.isUnconscious && character.hp <= 0) {
    return "death_save";
  }

  // Check for self-harm first
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(playerInput)) return "self_harm";
  }

  for (const [pattern, action] of ACTION_PATTERNS) {
    if (pattern.test(playerInput)) return action;
  }
  return "unknown";
}

/** Map skill keywords to the governing ability score */
function getSkillAbility(input: string): keyof Character["abilityScores"] {
  const lower = input.toLowerCase();
  if (/stealth|sneak|hide|pick lock|sleight|acrobat/i.test(lower)) return "dexterity";
  if (/persuade|deceive|perform|intimidate/i.test(lower)) return "charisma";
  if (/investigate|arcana|history|religion/i.test(lower)) return "intelligence";
  if (/perception|insight|survival|medicine|animal/i.test(lower)) return "wisdom";
  if (/climb|swim|jump|grapple|shove|athletics/i.test(lower)) return "strength";
  return "wisdom";
}

/**
 * D&D 5e proficiency bonus by level.
 * Levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6
 */
function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Scale enemy difficulty based on character level.
 * Returns an object with enemy AC, attack bonus, damage dice, and HP.
 */
function scaledEnemy(characterLevel: number) {
  const prof = proficiencyBonus(characterLevel);
  // Enemy scales with player level but stays beatable
  return {
    ac: 10 + prof,                           // 12 at L1, 13 at L5, 14 at L9, etc.
    attackBonus: prof + 1,                    // +3 at L1, +4 at L5, etc.
    damageDice: { count: 1, sides: 6 },      // 1d6 base
    damageBonus: Math.floor(characterLevel / 4), // +0 at L1, +1 at L4, etc.
  };
}

/**
 * Scale DC based on character level — keeps checks fair at all levels.
 * Base DCs: Easy 8, Medium 12, Hard 15
 */
function levelScaledDC(baseDC: number, characterLevel: number): number {
  // Add half proficiency bonus to keep DCs challenging but fair
  return baseDC + Math.floor(proficiencyBonus(characterLevel) / 2);
}

/**
 * Detect location changes from player input.
 * Only extract the actual destination name, cleaned up.
 */
function detectLocationChange(playerInput: string): string | undefined {
  const patterns = [
    /\b(?:go to|travel to|head to|walk to|move to|return to)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
    /\b(?:enter|visit)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
    /\b(?:go|travel|head|walk|move)\s+(?:into|inside|through)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
  ];

  for (const pattern of patterns) {
    const match = playerInput.match(pattern);
    if (match?.[1]) {
      const dest = match[1].trim().replace(/\s+/g, " ");
      if (dest.length < 2) continue;
      return dest.charAt(0).toUpperCase() + dest.slice(1);
    }
  }
  return undefined;
}

/**
 * D&D 5e XP rewards scaled for solo play.
 * Designed so it takes roughly 10-15 combats per level at low levels.
 */
function combatXpReward(characterLevel: number): number {
  const baseXp = [25, 50, 75, 100, 150, 200, 250, 350, 450, 550,
    650, 800, 950, 1100, 1300, 1500, 1700, 2000, 2300, 2600];
  return baseXp[Math.min(characterLevel - 1, 19)];
}

function skillCheckXpReward(characterLevel: number): number {
  return Math.max(5, Math.floor(combatXpReward(characterLevel) / 5));
}

function explorationXpReward(characterLevel: number): number {
  return Math.max(3, Math.floor(combatXpReward(characterLevel) / 10));
}

/**
 * The Rules Engine. Given a player action and game state, it produces
 * deterministic outcomes. The LLM only narrates what happened.
 */
export function resolveAction(
  playerInput: string,
  character: Character,
  gameState: { location: string; questLog: string[]; turnCount: number },
  recentEvents: WorldEvent[]
): EngineOutcome {
  const action = detectAction(playerInput, character);
  const outcome: EngineOutcome = {
    hpChange: 0,
    itemsGained: [],
    itemsLost: [],
    goldChange: 0,
    xpGained: 0,
    newNpcs: [],
  };

  // Detect location changes for any action type
  const destination = detectLocationChange(playerInput);
  if (destination) {
    outcome.locationChange = destination;
  }

  switch (action) {
    case "death_save": {
      // D&D 5e death saving throws — DC 10, no modifiers
      const rolled = d20();
      const result = {
        type: "save" as const,
        ability: "death",
        dc: 10,
        rolled,
        modifier: 0,
        total: rolled,
        success: rolled >= 10,
      };
      outcome.roll = result;

      if (rolled === 20) {
        outcome.hpChange = 1;
        outcome.deathSaveResult = "nat20";
      } else if (rolled === 1) {
        outcome.deathSaveResult = "nat1";
      } else if (rolled >= 10) {
        outcome.deathSaveResult = "success";
      } else {
        outcome.deathSaveResult = "failure";
      }
      break;
    }

    case "self_harm": {
      // CON save DC 12 to resist, take 1d6+2 on failure, half on success
      const conSave = abilityCheck(character.abilityScores.constitution, 12, "constitution");
      outcome.roll = { ...conSave, type: "save" };
      const dmg = damageRoll(1, 6, 2);
      if (conSave.success) {
        outcome.hpChange = -Math.max(1, Math.floor(dmg.total / 2));
      } else {
        outcome.hpChange = -dmg.total;
      }
      break;
    }

    case "attack":
    case "cast_spell": {
      // D&D 5e attack: d20 + ability modifier + proficiency bonus vs enemy AC
      const atkAbility = action === "cast_spell" ? "intelligence" : "strength";
      const atkScore = character.abilityScores[atkAbility];
      const atkMod = modifier(atkScore);
      const prof = proficiencyBonus(character.level);
      const totalAtkBonus = atkMod + prof;

      const enemy = scaledEnemy(character.level);
      const hit = attackRoll(atkScore, enemy.ac, prof);
      outcome.roll = hit;

      if (hit.success) {
        // Roll damage — critical hit on natural 20 doubles dice
        const isCrit = hit.rolled === 20;
        const baseDiceCount = action === "cast_spell" ? 2 : 1;
        const diceSides = action === "cast_spell" ? 6 : 8;
        const diceCount = isCrit ? baseDiceCount * 2 : baseDiceCount;
        const dmg = damageRoll(diceCount, diceSides, atkMod);
        // Minimum 1 damage on a hit
        outcome.damageDealt = Math.max(1, dmg.total);
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(character.level);
      } else {
        // Enemy counterattack — enemy uses their attack bonus vs player AC
        const enemyRoll = d20();
        const enemyTotal = enemyRoll + enemy.attackBonus;
        if (enemyTotal >= character.ac) {
          const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          outcome.hpChange = -Math.max(1, enemyDmg.total);
          outcome.damageTaken = Math.max(1, enemyDmg.total);
        }
      }
      break;
    }

    case "skill_check": {
      const ability = getSkillAbility(playerInput);
      const dc = levelScaledDC(12, character.level);
      const prof = proficiencyBonus(character.level);
      const result = abilityCheck(character.abilityScores[ability], dc, ability, prof);
      outcome.roll = result;
      if (result.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      }
      break;
    }

    case "explore": {
      // Perception check to find interesting things
      const dc = levelScaledDC(10, character.level);
      const prof = proficiencyBonus(character.level);
      const perc = abilityCheck(character.abilityScores.wisdom, dc, "wisdom", prof);
      outcome.roll = perc;
      if (perc.success) {
        outcome.xpGained = explorationXpReward(character.level);
      }
      break;
    }

    case "rest": {
      // Can't rest while unconscious
      if (character.isUnconscious) {
        outcome.restDenied = true;
        break;
      }

      // Rest abuse prevention: minimum turns between rests
      const turnsSinceLastRest = character.lastRestTurn >= 0
        ? gameState.turnCount - character.lastRestTurn
        : Infinity;

      if (turnsSinceLastRest < MIN_TURNS_BETWEEN_RESTS) {
        outcome.restDenied = true;
        break;
      }

      // Short rest: recover some HP (minimum 1 HP healed if not at max)
      const conMod = modifier(character.abilityScores.constitution);
      const healed = Math.max(1, Math.floor(character.maxHp * 0.25) + conMod);
      outcome.hpChange = Math.min(healed, character.maxHp - character.hp);
      outcome.lastRestTurn = gameState.turnCount;
      break;
    }

    case "trade": {
      // Trade interactions are narrative — no mechanical effect from engine
      break;
    }

    case "use_item": {
      // Check if the player has the item they're trying to use
      // Bidirectional: input contains item name OR item name contains key words from input
      const lower = playerInput.toLowerCase();
      const inputWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
      const ignoreWords = new Set(["use", "drink", "eat", "equip", "open", "read", "the", "my", "this", "that", "some"]);
      const searchTerms = inputWords.filter(w => !ignoreWords.has(w));
      const matchedItem = character.inventory.find((item) => {
        const itemLow = item.toLowerCase();
        // Exact: input contains full item name
        if (lower.includes(itemLow)) return true;
        // Partial: any search term from input appears in item name
        return searchTerms.some(term => itemLow.includes(term));
      });
      if (matchedItem) {
        const itemLower = matchedItem.toLowerCase();
        const consumables = ["potion", "rations", "scroll", "elixir", "antidote"];
        if (consumables.some((c) => itemLower.includes(c))) {
          outcome.itemsLost = [matchedItem];

          // Healing potions: 2d4+2 HP (D&D standard)
          if (itemLower.includes("healing") || itemLower.includes("health") ||
              (itemLower.includes("potion") && !itemLower.includes("poison"))) {
            const healed = damageRoll(2, 4, 2);
            outcome.hpChange = Math.min(healed.total, character.maxHp - character.hp);
          }

          // Poison potions hurt the player
          if (itemLower.includes("poison")) {
            const dmg = damageRoll(2, 4, 0);
            outcome.hpChange = -dmg.total;
          }
        }
      } else {
        outcome.itemNotFound = true;
      }
      break;
    }

    case "talk": {
      // Social interaction: CHA check with proficiency
      // getSkillAbility returns "charisma" for persuade/deceive/intimidate
      // For generic "talk" it returns "wisdom" — override to charisma for social
      const detectedAbility = getSkillAbility(playerInput);
      const socialAbility = detectedAbility === "charisma" ? "charisma" : "charisma";
      const dc = levelScaledDC(11, character.level);
      const prof = proficiencyBonus(character.level);
      const socialResult = abilityCheck(
        character.abilityScores[socialAbility],
        dc,
        "charisma",
        prof
      );
      outcome.roll = socialResult;
      if (socialResult.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      }
      break;
    }

    case "unknown":
      // Purely narrative — no mechanical effect
      break;
  }

  return outcome;
}
