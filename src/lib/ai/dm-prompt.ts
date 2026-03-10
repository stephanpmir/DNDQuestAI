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
4. Do NOT invent mechanical effects (no "you gain 50 gold" or "you find a sword" unless the engine says so).
5. NEVER contradict the "Permanent Facts" section. These are absolute truth.
6. Reference established NPCs by name when they're present.
7. Be vivid and engaging. Describe scenes, NPCs, and combat with flair.
8. Present 2-3 meaningful choices to the player at the end of each response.
9. Keep responses under 250 words.

## Response Format
Respond with valid JSON:
\`\`\`json
{
  "narrative": "Your story text here...",
  "suggestedActions": ["action 1", "action 2", "action 3"],
  "mentionedNpcs": ["NPC Name"],
  "locationDescription": "Brief description if this is a new location"
}
\`\`\`
Always include "narrative". Other fields are optional.`;
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
