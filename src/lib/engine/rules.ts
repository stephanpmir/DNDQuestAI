import type { Character } from "@/types/character";
import type { EngineOutcome, WorldEvent } from "@/types/world";
import { abilityCheck, attackRoll, damageRoll, modifier, d20, roll } from "./dice";

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

/** Keywords that map to action types */
const ACTION_PATTERNS: [RegExp, ActionType][] = [
  [/\b(attack|strike|hit|fight|slash|stab|shoot|swing)\b/i, "attack"],
  [/\b(cast|spell|magic|fireball|heal|cure)\b/i, "cast_spell"],
  [/\b(pick lock|sneak|hide|stealth|climb|swim|jump|search|investigate|persuade|intimidate|deceive|perception|check)\b/i, "skill_check"],
  [/\b(explore|look around|examine|enter|go to|travel|move|walk|head)\b/i, "explore"],
  [/\b(talk|speak|ask|greet|negotiate|converse|say)\b/i, "talk"],
  [/\b(rest|sleep|camp|long rest|short rest)\b/i, "rest"],
  [/\b(buy|sell|trade|shop|purchase|barter)\b/i, "trade"],
  [/\b(use|drink|eat|equip|open|read)\b/i, "use_item"],
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

/** Determine DC based on turn count (scales slightly over time) */
function scaledDC(baseDC: number, turnCount: number): number {
  const scaling = Math.floor(turnCount / 15);
  return Math.min(baseDC + scaling, 25);
}

/**
 * Detect location changes from player input.
 * Only extract the actual destination name, cleaned up.
 */
function detectLocationChange(playerInput: string): string | undefined {
  const patterns = [
    /\b(?:go to|travel to|head to|walk to|move to|return to|head toward|walk toward|head towards|walk towards)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
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
 * These are designed so it takes roughly 10-15 combats per level at low levels,
 * scaling up for higher levels.
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
        // Natural 20: regain 1 HP and consciousness
        outcome.hpChange = 1;
        outcome.deathSaveResult = "nat20";
      } else if (rolled === 1) {
        // Natural 1: counts as 2 failures
        outcome.deathSaveResult = "nat1";
      } else if (rolled >= 10) {
        outcome.deathSaveResult = "success";
      } else {
        outcome.deathSaveResult = "failure";
      }
      break;
    }

    case "self_harm": {
      // Self-harm: player takes damage from their own action
      // CON save DC 12 to resist, take 1d6+2 on failure, half on success
      const conSave = abilityCheck(character.abilityScores.constitution, 12, "constitution");
      outcome.roll = {
        ...conSave,
        type: "save",
      };
      const dmg = damageRoll(1, 6, 2);
      if (conSave.success) {
        // Half damage on successful save
        outcome.hpChange = -Math.max(1, Math.floor(dmg.total / 2));
      } else {
        outcome.hpChange = -dmg.total;
      }
      break;
    }

    case "attack":
    case "cast_spell": {
      // Player attacks — roll to hit vs a scaled enemy AC
      const enemyAC = scaledDC(12, gameState.turnCount);
      const atkAbility = action === "cast_spell" ? "intelligence" : "strength";
      const atkScore = character.abilityScores[atkAbility];
      const hit = attackRoll(atkScore, enemyAC);
      outcome.roll = hit;

      if (hit.success) {
        // Roll damage — critical hit on natural 20 doubles dice
        const isCrit = hit.rolled === 20;
        const baseDiceCount = action === "cast_spell" ? 2 : 1;
        const diceSides = action === "cast_spell" ? 6 : 8;
        const diceCount = isCrit ? baseDiceCount * 2 : baseDiceCount;
        const abilityMod = modifier(atkScore);
        const dmg = damageRoll(diceCount, diceSides, abilityMod);
        // Store damage info in the outcome for display
        outcome.damageDealt = dmg.total;
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(character.level);
      } else {
        // Enemy counterattack — roll enemy attack vs player AC
        const enemyAtk = attackRoll(12, character.ac);
        if (enemyAtk.success) {
          const enemyDmg = damageRoll(1, 6, 1);
          outcome.hpChange = -enemyDmg.total;
          outcome.damageTaken = enemyDmg.total;
        }
      }
      break;
    }

    case "skill_check": {
      const ability = getSkillAbility(playerInput);
      const dc = scaledDC(13, gameState.turnCount);
      const result = abilityCheck(character.abilityScores[ability], dc, ability);
      outcome.roll = result;
      if (result.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      }
      break;
    }

    case "explore": {
      // Perception check to find interesting things
      const percDC = scaledDC(10, gameState.turnCount);
      const perc = abilityCheck(character.abilityScores.wisdom, percDC, "wisdom");
      outcome.roll = perc;
      if (perc.success) {
        outcome.xpGained = explorationXpReward(character.level);
      }
      break;
    }

    case "rest": {
      // Rest abuse prevention: minimum turns between rests
      const turnsSinceLastRest = character.lastRestTurn >= 0
        ? gameState.turnCount - character.lastRestTurn
        : Infinity;

      if (turnsSinceLastRest < MIN_TURNS_BETWEEN_RESTS) {
        outcome.restDenied = true;
        break;
      }

      // Short rest: recover some HP
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
      const lower = playerInput.toLowerCase();
      const matchedItem = character.inventory.find(
        (item) => lower.includes(item.toLowerCase())
      );
      if (matchedItem) {
        const itemLower = matchedItem.toLowerCase();
        // Consumables get removed
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
        // Player tried to use something they don't have
        outcome.itemNotFound = true;
      }
      break;
    }

    case "talk": {
      // Social interaction: charisma check for persuasion/deception/intimidation
      const socialAbility = getSkillAbility(playerInput);
      // Only roll if it's a social skill, otherwise default to charisma
      const talkAbility = ["charisma"].includes(socialAbility) ? socialAbility : "charisma";
      const socialDC = scaledDC(12, gameState.turnCount);
      const socialResult = abilityCheck(
        character.abilityScores[talkAbility],
        socialDC,
        talkAbility
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
