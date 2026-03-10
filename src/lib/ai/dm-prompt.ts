import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { EngineOutcome } from "@/types/world";

/**
 * System prompt — defines the LLM's role as NARRATOR only.
 * Character stats and world state are injected separately by the context assembler.
 */
export function buildSystemPrompt(
  character: Character,
  gameState: Pick<GameState, "location" | "questLog" | "turnCount">
): string {
  return `You are the Narrator for a solo D&D 5e campaign. You do NOT decide game mechanics — a rules engine handles all dice rolls, damage, item changes, and state updates. Your job is to write vivid, engaging narrative text that describes what happens based on the engine's decisions.

## Player Character
- Name: ${character.name}
- Gender: ${character.gender}
- Race: ${character.race}
- Class: ${character.class}
- Level: ${character.level}
- HP: ${character.hp}/${character.maxHp}
- AC: ${character.ac}
- STR ${character.abilityScores.strength} DEX ${character.abilityScores.dexterity} CON ${character.abilityScores.constitution} WIS ${character.abilityScores.wisdom} INT ${character.abilityScores.intelligence} CHA ${character.abilityScores.charisma}
- Inventory: ${character.inventory.length > 0 ? character.inventory.join(", ") : "empty"}
- Gold: ${character.gold}

## Current State
- Location: ${gameState.location || "Unknown"}
- Turn: ${gameState.turnCount}
- Active Quests: ${gameState.questLog.length > 0 ? gameState.questLog.join("; ") : "None"}

## Critical Rules
1. You are the NARRATOR, not the game master. The engine decides outcomes.
2. When given an engine outcome (roll results, HP changes, items), you MUST incorporate those EXACT results into your narrative. Do not contradict them.
3. If the engine says a roll failed, describe the failure. If it succeeded, describe success. Never override the engine.
4. Do NOT invent mechanical effects. NEVER write things like "you gain 50 gold", "you find a sword", "you level up", "you earn 100 XP", "you receive a potion". The engine controls ALL items, gold, XP, levels, and HP. Your narrative must NEVER declare the player gaining, losing, or receiving anything.
5. NEVER contradict the "Permanent Facts" section. These are absolute truth.
6. Reference established NPCs by name when they're present.
7. Be vivid and engaging. Describe scenes, NPCs, and combat with flair.
8. Do NOT list suggested actions, options, or choices. Do NOT write "You could...", "What do you do?", numbered lists of actions, or any form of menu. Let the player decide freely. The ONLY exception is if the Engine Outcome contains a "MANDATORY ESCALATION" section — then and only then, weave the hint naturally into the narrative.
9. Keep responses under 250 words.
10. Write ONLY narrative prose. No code, no JSON keys, no markdown formatting like ** or __ in the narrative text itself. Pure storytelling.
11. Do NOT begin your narrative with a state summary, recap, or preamble. Jump straight into the scene. Never start with "As a level X...", "Currently at...", "With your HP at...", or any mechanical state description. Start with what is HAPPENING in the story.
12. On the very first turn, introduce a clear quest or objective for the player within the opening narration — a mission, a mystery, a call to action.

## Response Format
Respond with valid JSON containing ONLY this field:
\`\`\`json
{
  "narrative": "Your story text here — pure prose, no markdown, no code, no mechanical statements, no action lists..."
}
\`\`\`
Always include "narrative". Do NOT include gameStateUpdate, suggestedActions, or any other fields — the engine handles everything. The narrative must read like a novel, not a game log.`;
}

/**
 * Build the engine context message — tells the LLM what the engine decided
 * AND provides the structured context window (anchors + retrieved facts).
 */
export function buildEngineContextMessage(
  playerAction: string,
  engineOutcome: EngineOutcome,
  formattedContext: string,
  contradictionHint?: string
): string {
  const parts: string[] = [];

  // Structured context (anchors + sliding window + retrieved)
  if (formattedContext) {
    parts.push(formattedContext);
  }

  // Player action
  parts.push(`## Player Action\n"${playerAction}"`);

  // Engine outcome
  const outcomeParts: string[] = [];
  const o = engineOutcome;

  if (o.roll) {
    const rollDesc = o.roll.success ? "SUCCESS" : "FAILURE";
    outcomeParts.push(
      `Dice Roll: ${o.roll.type}${o.roll.ability ? ` (${o.roll.ability})` : ""} — rolled ${o.roll.rolled} + ${o.roll.modifier} = ${o.roll.total}${o.roll.dc ? ` vs DC ${o.roll.dc}` : ""} → **${rollDesc}**`
    );
  }
  if (o.hpChange !== 0) {
    outcomeParts.push(`HP Change: ${o.hpChange > 0 ? "+" : ""}${o.hpChange}`);
  }
  if (o.itemsGained.length > 0) {
    outcomeParts.push(`Items Gained: ${o.itemsGained.join(", ")}`);
  }
  if (o.itemsLost.length > 0) {
    outcomeParts.push(`Items Lost: ${o.itemsLost.join(", ")}`);
  }
  if (o.goldChange !== 0) {
    outcomeParts.push(`Gold Change: ${o.goldChange > 0 ? "+" : ""}${o.goldChange}`);
  }
  if (o.xpGained > 0) {
    outcomeParts.push(`XP Gained: +${o.xpGained}`);
  }
  if (o.locationChange) {
    outcomeParts.push(`Location Change: → ${o.locationChange}`);
  }
  if (o.newQuest) {
    outcomeParts.push(`New Quest: ${o.newQuest}`);
  }
  if (o.completeQuest) {
    outcomeParts.push(`Quest Completed: ${o.completeQuest}`);
  }

  if (o.restDenied) {
    outcomeParts.push("REST DENIED: The character is not tired enough to rest. Narrate that they tried to rest but feel too alert or haven't been active enough.");
  }
  if (o.deathSaveResult) {
    const dsLabels: Record<string, string> = {
      nat20: "NATURAL 20 — The character miraculously regains consciousness with 1 HP!",
      nat1: "NATURAL 1 — Two death save failures! The character teeters closer to death.",
      success: "Death save SUCCESS — The character clings to life.",
      failure: "Death save FAILURE — The character slips closer to death.",
    };
    outcomeParts.push(`Death Save: ${dsLabels[o.deathSaveResult]}`);
  }
  if (o.damageDealt) {
    outcomeParts.push(`Damage Dealt: ${o.damageDealt}${o.isCriticalHit ? " (CRITICAL HIT!)" : ""}`);
  }
  if (o.damageTaken) {
    outcomeParts.push(`Damage Taken: ${o.damageTaken} from enemy counterattack`);
  }
  if (o.itemNotFound) {
    outcomeParts.push("ITEM NOT FOUND: The player tried to use an item they don't have. Narrate that they reach for it but can't find it.");
  }

  if (outcomeParts.length > 0) {
    parts.push(`## Engine Outcome (incorporate these EXACTLY)\n${outcomeParts.join("\n")}`);
  } else {
    parts.push("## Engine Outcome\nNo mechanical changes. This is a purely narrative moment.");
  }

  // Escalation hint
  if (o.escalationHint) {
    parts.push(`## MANDATORY ESCALATION\n${o.escalationHint}`);
  }

  // Contradiction corrections (if regenerating)
  if (contradictionHint) {
    parts.push(contradictionHint);
  }

  return parts.join("\n\n");
}
