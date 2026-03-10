import type { Character } from "@/types/character";
import type { EngineOutcome, WorldEvent } from "@/types/world";
import { abilityCheck, attackRoll, damageRoll, modifier } from "./dice";

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

function detectAction(playerInput: string): ActionType {
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
  return "wisdom"; // default for generic "check"
}

/** Determine DC based on turn count (scales slightly over time) */
function scaledDC(baseDC: number, turnCount: number): number {
  const scaling = Math.floor(turnCount / 15);
  return Math.min(baseDC + scaling, 25);
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
  const action = detectAction(playerInput);
  const outcome: EngineOutcome = {
    hpChange: 0,
    itemsGained: [],
    itemsLost: [],
    goldChange: 0,
    xpGained: 0,
    newNpcs: [],
  };

  switch (action) {
    case "attack":
    case "cast_spell": {
      // Player attacks — roll to hit vs a scaled enemy AC
      const enemyAC = scaledDC(12, gameState.turnCount);
      const atkAbility = action === "cast_spell" ? "intelligence" : "strength";
      const atkScore = character.abilityScores[atkAbility];
      const hit = attackRoll(atkScore, enemyAC);
      outcome.roll = hit;

      if (hit.success) {
        // Roll damage
        const dmgDice = action === "cast_spell" ? { count: 2, sides: 6 } : { count: 1, sides: 8 };
        const dmg = damageRoll(dmgDice.count, dmgDice.sides, modifier(atkScore));
        outcome.xpGained = 15 + Math.floor(gameState.turnCount / 5) * 5;
      } else {
        // Enemy counterattack — roll enemy attack vs player AC
        const enemyAtk = attackRoll(12, character.ac);
        if (enemyAtk.success) {
          const enemyDmg = damageRoll(1, 6, 1);
          outcome.hpChange = -enemyDmg.total;
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
        outcome.xpGained = 10;
      }
      break;
    }

    case "explore": {
      // Exploration: perception check to find interesting things
      const percDC = scaledDC(10, gameState.turnCount);
      const perc = abilityCheck(character.abilityScores.wisdom, percDC, "wisdom");
      outcome.roll = perc;
      if (perc.success) {
        outcome.xpGained = 5;
      }
      break;
    }

    case "rest": {
      // Short rest: recover some HP
      const conMod = modifier(character.abilityScores.constitution);
      const healed = Math.max(1, Math.floor(character.maxHp * 0.25) + conMod);
      outcome.hpChange = Math.min(healed, character.maxHp - character.hp);
      break;
    }

    case "trade": {
      // Trade interactions are handled narratively, but we flag it
      break;
    }

    case "use_item": {
      // Check if the player has the item they're trying to use
      const lower = playerInput.toLowerCase();
      const matchedItem = character.inventory.find(
        (item) => lower.includes(item.toLowerCase())
      );
      if (matchedItem) {
        // Consumables get removed
        const consumables = ["potion", "rations", "scroll", "elixir", "antidote"];
        if (consumables.some((c) => matchedItem.toLowerCase().includes(c))) {
          outcome.itemsLost = [matchedItem];
          if (matchedItem.toLowerCase().includes("potion")) {
            const healed = damageRoll(2, 4, 2);
            outcome.hpChange = Math.min(healed.total, character.maxHp - character.hp);
          }
        }
      }
      break;
    }

    case "talk":
    case "unknown":
      // Purely narrative — no mechanical effect
      break;
  }

  return outcome;
}
