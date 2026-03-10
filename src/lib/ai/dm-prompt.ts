import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { EngineOutcome } from "@/types/world";
import type { Companion } from "@/types/companion";
import type { KarmaEvent } from "@/lib/karma";
import { buildKarmaContext } from "@/lib/karma";
import { buildCompanionContext } from "@/types/companion";
import { getThemeNarrationProfile, type CampaignTheme } from "@/lib/campaigns";

/**
 * System prompt — defines the LLM's role as NARRATOR only.
 * Character stats and world state are injected separately by the context assembler.
 */
export function buildSystemPrompt(
  character: Character,
  gameState: Pick<GameState, "location" | "questLog" | "turnCount">,
  karmaData?: { karma: number; history: KarmaEvent[] },
  companions?: Companion[],
  campaignTheme?: string
): string {
  // Build optional context sections
  const karmaSection = karmaData
    ? "\n\n" + buildKarmaContext(karmaData.karma, karmaData.history, character.fame)
    : "";

  const companionSection = companions
    ? "\n\n" + buildCompanionContext(companions)
    : "";

  let campaignSection = "";
  if (campaignTheme) {
    const profile = getThemeNarrationProfile(campaignTheme as CampaignTheme);
    if (profile) {
      campaignSection = `\n\n## Campaign Tone
- Theme: ${profile.theme}
- Narrative Style: ${profile.narrativeInstructions}
- Non-Combat Encounters: ${profile.nonCombatEncounters.join(", ")}
- Consequence Style: ${profile.consequenceStyle}`;
    }
  }

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
- Skill Proficiencies: ${character.skillProficiencies?.length > 0 ? character.skillProficiencies.join(", ") : "none"}${character.cantrips?.length > 0 ? `\n- Cantrips: ${character.cantrips.join(", ")}` : ""}${character.spells?.length > 0 ? `\n- Spells: ${character.spells.join(", ")}` : ""}${character.fightingStyle ? `\n- Fighting Style: ${character.fightingStyle}` : ""}
- Racial Traits: ${character.racialTraits?.length > 0 ? character.racialTraits.join(", ") : character.race + " traits"}

## Current State
- Location: ${gameState.location || "Unknown"}
- Turn: ${gameState.turnCount}
- Active Quests: ${gameState.questLog.length > 0 ? gameState.questLog.join("; ") : "None"}
${karmaSection}${companionSection}${campaignSection}

## Critical Rules
1. You are the NARRATOR, not the game master. The engine decides outcomes.
2. When given an engine outcome (roll results, HP changes, items), you MUST incorporate those EXACT results into your narrative. Do not contradict them.
3. If the engine says a roll failed, describe the failure. If it succeeded, describe success. Never override the engine.
4. Do NOT invent mechanical effects. NEVER write things like "you gain 50 gold", "you find a sword", "you level up", "you earn 100 XP", "you receive a potion". The engine controls ALL items, gold, XP, levels, and HP. Your narrative must NEVER declare the player gaining, losing, or receiving anything.
5. NEVER contradict the "Permanent Facts" section. These are absolute truth.
6. Reference established NPCs by name when they're present.
7. Be vivid and engaging. Describe scenes, NPCs, and combat with flair. Prioritize narration, puzzles, dialogue, and moral dilemmas over pure combat.
8. Do NOT list suggested actions, options, or choices. Do NOT write "You could...", "What do you do?", numbered lists of actions, or any form of menu. Let the player decide freely. The ONLY exception is if the Engine Outcome contains a "MANDATORY ESCALATION" section — then and only then, weave the hint naturally into the narrative.
9. Keep responses under 250 words.
10. Write ONLY narrative prose. No code, no JSON keys, no markdown formatting like ** or __ in the narrative text itself. Pure storytelling.
11. Do NOT begin your narrative with a state summary, recap, or preamble. Jump straight into the scene. Never start with "As a level X...", "Currently at...", "With your HP at...", or any mechanical state description. Start with what is HAPPENING in the story.
12. On the very first turn, introduce a clear quest or objective for the player within the opening narration — a mission, a mystery, a call to action. Establish the starting location vividly — describe where the player is, what they see, hear, and smell.
13. When companions are present, weave them into the scene. They speak, react, and have opinions about the player's choices. Use their personality traits.
14. Reflect the player's karma alignment in how NPCs react, how the world responds, and in the tone of narration. Evil players face distrust and hostility from good NPCs. Good players receive warmth and aid.
15. When divine intervention occurs, describe it vividly — divine blessings as radiant warmth, divine punishment as cold dread, dark temptation as shadowy whispers.
16. NEVER allow impossible actions. If the engine marks an action as DENIED, narrate the failure vividly. A Fighter cannot fly, summon creatures, or cast spells. A level 1 Wizard cannot teleport. No one can destroy cities, become gods, or gain infinite power. The world has rules — enforce them through narration.
17. When the player claims to do something their class/level cannot do, describe the attempt failing naturally: they jump but gravity wins, they wave their hands but no magic answers, they shout commands but nothing obeys.

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
  if (o.karmaChange) {
    const direction = o.karmaChange.amount > 0 ? "GOOD" : "EVIL";
    outcomeParts.push(`Karma Shift: ${direction} action detected (${o.karmaChange.type}). Narrate subtle moral weight — NPCs notice, the world reacts.`);
  }
  if (o.divineEffect) {
    outcomeParts.push(`DIVINE INTERVENTION: ${o.divineEffect.description} (${o.divineEffect.type} from ${o.divineEffect.source === "good_god" ? "the gods of light" : "dark powers"}, roll modifier ${o.divineEffect.rollModifier > 0 ? "+" : ""}${o.divineEffect.rollModifier})`);
  }
  if (o.actionDenied) {
    outcomeParts.push(`ACTION DENIED: The player attempted to "${o.actionDenied.attempted}" but this is impossible. Reason: ${o.actionDenied.reason}. Narrate the FAILURE — describe the character attempting the action and it not working. Do NOT let the action succeed under any circumstances. Be descriptive about why it fails in-world (no magic ability, physical impossibility, etc.).`);
  }
  if (o.travelEncounter) {
    outcomeParts.push(`TRAVEL ENCOUNTER: While traveling, the character encounters ${o.travelEncounter.description}. This is a ${o.travelEncounter.type} encounter. Narrate the journey first — describe the terrain, weather, and distance — then introduce this encounter naturally along the way.`);
  }
  if (o.guardInvestigation) {
    outcomeParts.push(`GUARD INVESTIGATION: ${o.guardInvestigation.narrativeHint} Weave this subtly into the scene — the player notices guards talking, wanted posters appearing, or NPCs whispering. Do NOT reveal the exact mechanic.`);
  }
  if (o.guardConfrontation) {
    outcomeParts.push(`GUARD CONFRONTATION: Guards have identified the player for a ${o.guardConfrontation.crimeType} committed at ${o.guardConfrontation.crimeLocation}. They approach the player to confront them. Narrate a tense encounter — guards demand surrender, threaten arrest, or engage in a standoff. The player can fight, flee, or talk their way out.`);
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
