import type { Character } from "@/types/character";
import type { GameState } from "@/types/game";
import type { EngineOutcome } from "@/types/world";
import type { Companion } from "@/types/companion";
import type { KarmaEvent } from "@/lib/karma";
import { buildKarmaContext } from "@/lib/karma";
import { buildCompanionContext } from "@/types/companion";
import { getThemeNarrationProfile, type CampaignTheme } from "@/lib/campaigns";
import type { ResourcePool } from "@/lib/resources";

/**
 * Format character resources into a concise string for the system prompt.
 * Groups spell slots together and lists class features separately.
 */
function formatResourcesForPrompt(resources?: ResourcePool): string {
  if (!resources || resources.length === 0) return "";

  const spellSlots: string[] = [];
  const classFeatures: string[] = [];

  for (const r of resources) {
    if (r.key === "hit_dice") continue; // Not useful for narration
    if (r.key.startsWith("spell_slot_") || r.key === "pact_slots") {
      if (r.current > 0 || r.max > 0) {
        spellSlots.push(`${r.label}: ${r.current}/${r.max}`);
      }
    } else {
      const maxStr = r.max === Infinity ? "unlimited" : String(r.max);
      classFeatures.push(`${r.label}: ${r.current}/${maxStr}`);
    }
  }

  const parts: string[] = [];
  if (spellSlots.length > 0) {
    parts.push(`- Spell Slots: ${spellSlots.join(", ")}`);
  }
  if (classFeatures.length > 0) {
    parts.push(`- Class Resources: ${classFeatures.join(", ")}`);
  }
  return parts.length > 0 ? parts.join("\n") + "\n" : "";
}

/**
 * System prompt — defines the LLM's role as NARRATOR only.
 * Character stats and world state are injected separately by the context assembler.
 */
export function buildSystemPrompt(
  character: Character,
  gameState: Pick<GameState, "location" | "questLog" | "turnCount">,
  karmaData?: { karma: number; history: KarmaEvent[] },
  companions?: Companion[],
  campaignTheme?: string,
  groundItems?: string[]
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
${formatResourcesForPrompt(character.resources)}
## Current State
- Location: ${gameState.location || "Unknown"}
- Turn: ${gameState.turnCount}
- Active Quests: ${gameState.questLog.length > 0 ? gameState.questLog.join("; ") : "None"}${groundItems && groundItems.length > 0 ? `\n- Items on the ground: ${groundItems.join(", ")}` : ""}
${karmaSection}${companionSection}${campaignSection}

## Critical Rules
1. LANGUAGE: Detect the language of the player's MOST RECENT message and respond in THAT language ONLY. "I don't understand" is English — respond in English. "Je ne comprends pas" is French — respond in French. ONLY the player's actual typed words determine the language. NEVER infer language from character names, NPC names, location names, in-game dialogue, or story context. A player named "François" who types "I attack the goblin" is writing in ENGLISH. Default to ENGLISH when there is any ambiguity. Never mix languages in a single response.
2. You are the NARRATOR, not the game master. The engine decides outcomes.
3. When given an engine outcome (roll results, HP changes, items), you MUST incorporate those EXACT results into your narrative. Do not contradict them.
4. If the engine says a roll failed, describe the failure. If it succeeded, describe success. Never override the engine.
5. Do NOT invent mechanical effects. NEVER write things like "you gain 50 gold", "you find a sword", "you level up", "you earn 100 XP", "you receive a potion". The engine controls ALL items, gold, XP, levels, and HP. Your narrative must NEVER declare the player gaining, losing, or receiving anything.
6. NEVER contradict the "Permanent Facts" section. These are absolute truth.
7. Reference established NPCs by name when they're present.
8. Be vivid and engaging. Describe scenes, NPCs, and combat with flair. Prioritize narration, puzzles, dialogue, and moral dilemmas over pure combat.
9. Do NOT list suggested actions, options, or choices. Do NOT write "You could...", "What do you do?", numbered lists of actions, or any form of menu. Let the player decide freely. The ONLY exception is if the Engine Outcome contains a "MANDATORY ESCALATION" section — then and only then, weave the hint naturally into the narrative.
10. NEVER speak, act, decide, or think for the player character. You narrate the WORLD — NPCs, environments, consequences — but the player controls ALL of their own actions, words, thoughts, and decisions. NEVER write dialogue the player says ("you said...", "you replied..."). NEVER describe the player making choices ("you decided to...", "you hesitated before..."). NEVER narrate the player's internal thoughts or emotions ("you felt...", "you pondered...", "you weighed the options..."). You may describe what the player OBSERVES or what happens TO them, but never what they DO, SAY, THINK, or FEEL. End scenes at a point where the player must choose what to do next.
11. LENGTH: Your narrative MUST be 80–150 words. Count carefully. Aim for ~100 words. Write tight, evocative prose — every sentence must earn its place. Prefer short punchy paragraphs over long flowing ones. If you find yourself exceeding 150 words, cut ruthlessly. End at a natural decision point, not mid-scene. NPC dialogue counts toward the word limit — keep speeches to 1-2 sentences max.
12. Write ONLY narrative prose. No code, no JSON keys, no markdown formatting like ** or __ in the narrative text itself. Pure storytelling.
13. Do NOT begin your narrative with a state summary, recap, or preamble. Jump straight into the scene. Never start with "As a level X...", "Currently at...", "With your HP at...", or any mechanical state description. Start with what is HAPPENING in the story.
14. On the very first turn, introduce a clear quest or objective for the player within the opening narration — a mission, a mystery, a call to action. Establish the starting location vividly — describe where the player is, what they see, hear, and smell.
15. When companions are present, weave them into the scene. They speak, react, and have opinions about the player's choices. Use their personality traits.
16. Reflect the player's karma alignment in how NPCs react, how the world responds, and in the tone of narration. Evil players face distrust and hostility from good NPCs. Good players receive warmth and aid.
17. When divine intervention occurs, describe it vividly — divine blessings as radiant warmth, divine punishment as cold dread, dark temptation as shadowy whispers.
18. NEVER allow impossible actions. If the engine marks an action as DENIED, narrate the failure vividly. A Fighter cannot fly, summon creatures, or cast spells. A level 1 Wizard cannot teleport. No one can destroy cities, become gods, or gain infinite power. The world has rules — enforce them through narration.
19. When the player claims to do something their class/level cannot do, describe the attempt failing naturally: they jump but gravity wins, they wave their hands but no magic answers, they shout commands but nothing obeys.
20. SKILL CHECKS: When a player attempts an action with an uncertain outcome (searching, persuading, sneaking, finding something, attacking, climbing, deciphering, lockpicking, etc.), do NOT automatically succeed or fail. Instead, describe the attempt WITHOUT resolving the outcome and include a "checkRequired" field in your JSON response. The narrative should set up the moment of uncertainty and end with a prompt like "Make a Wisdom (Survival) check." The engine will handle the actual dice roll and you will receive the result in the next turn to narrate the outcome.

## Response Format
Respond with valid JSON containing ONLY these fields:
\`\`\`json
{
  "narrative": "Your story text here — pure prose, no markdown, no code, no mechanical statements, no action lists...",
  "sceneImagePrompt": "15-25 word description of the scene for image generation",
  "checkRequired": { "stat": "Wisdom", "skill": "Survival", "dc": 13, "description": "Navigate through the misty forest" }
}
\`\`\`
Always include "narrative" and "sceneImagePrompt". Include "checkRequired" ONLY when the player attempts an action with an uncertain outcome. Do NOT include gameStateUpdate, suggestedActions, or any other fields — the engine handles everything. The narrative must read like a novel, not a game log. Remember: 80–150 words max. Completeness matters — always finish your sentences and close with a natural stopping point.

## checkRequired Rules
Include checkRequired when the player attempts something uncertain. The fields are:
- stat: The ability score ("Strength", "Dexterity", "Constitution", "Wisdom", "Intelligence", or "Charisma")
- skill: The specific skill (e.g. "Perception", "Stealth", "Persuasion", "Athletics", "Arcana", "Investigation", "Survival", etc.)
- dc: Difficulty class (integer 5-25). Easy=5-9, Medium=10-14, Hard=15-19, Very Hard=20-25
- description: One sentence explaining what the check represents
Do NOT include checkRequired for: simple movement, talking to present NPCs, using items from inventory, resting, or actions the engine already resolved (shown in Engine Outcome).

## sceneImagePrompt Rules
The sceneImagePrompt describes ONLY the location, atmosphere, and any NPCs or enemies visible in the scene. NEVER include the player character. Focus on environment, lighting, mood, and any creatures or figures present. Always end with "dark fantasy digital art dramatic lighting". Example: "dimly lit tavern interior wooden beams flickering firelight hooded figure at corner table dark fantasy digital art dramatic lighting"`;
}

/**
 * Build the engine context message — tells the LLM what the engine decided
 * AND provides the structured context window (anchors + retrieved facts).
 */
/**
 * Detect the language of the player's most recent message.
 *
 * Rules:
 * - Non-Latin scripts (CJK, Cyrillic, Arabic, etc.) are detected by character ratio.
 * - Latin-script languages require MULTIPLE common function words (articles,
 *   pronouns, prepositions) to avoid false positives from proper nouns,
 *   location names, or in-game terms that happen to look like foreign words.
 * - Short messages (< 4 words) always default to English for Latin scripts,
 *   since a single word like a character name can't reliably indicate language.
 * - When in doubt, returns "English".
 */
function detectPlayerLanguage(text: string): string {
  const cleaned = text.replace(/[0-9\s\p{P}\p{S}]/gu, "");
  if (cleaned.length === 0) return "English";

  // Non-Latin scripts — detected by character ratio (reliable)
  const cjk = cleaned.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  if (cjk && cjk.length > cleaned.length * 0.3) return "Chinese";

  const japanese = cleaned.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
  if (japanese && japanese.length > cleaned.length * 0.2) return "Japanese";

  const korean = cleaned.match(/[\uac00-\ud7af\u1100-\u11ff]/g);
  if (korean && korean.length > cleaned.length * 0.3) return "Korean";

  const cyrillic = cleaned.match(/[\u0400-\u04ff]/g);
  if (cyrillic && cyrillic.length > cleaned.length * 0.3) return "Russian";

  const arabic = cleaned.match(/[\u0600-\u06ff\u0750-\u077f]/g);
  if (arabic && arabic.length > cleaned.length * 0.3) return "Arabic";

  const devanagari = cleaned.match(/[\u0900-\u097f]/g);
  if (devanagari && devanagari.length > cleaned.length * 0.3) return "Hindi";

  const thai = cleaned.match(/[\u0e00-\u0e7f]/g);
  if (thai && thai.length > cleaned.length * 0.3) return "Thai";

  const greek = cleaned.match(/[\u0370-\u03ff]/g);
  if (greek && greek.length > cleaned.length * 0.3) return "Greek";

  const hebrew = cleaned.match(/[\u0590-\u05ff]/g);
  if (hebrew && hebrew.length > cleaned.length * 0.3) return "Hebrew";

  // Latin-script languages — require strong evidence to avoid false positives
  // from character names, location names, or in-game dialogue.
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  // Short messages can't reliably indicate a non-English Latin language
  if (words.length < 4) return "English";

  // Count function-word matches — require at least 2 distinct hits
  function countMatches(pattern: RegExp): number {
    const hits = new Set<string>();
    for (const w of words) {
      if (pattern.test(w)) hits.add(w);
    }
    return hits.size;
  }

  // French: require 2+ function words AND diacritics or strong word evidence
  const frenchWords = /^(je|tu|il|elle|nous|vous|ils|elles|les|une?|des|est|sont|avec|dans|pour|qui|sur|pas|mais|cette?|mon|ton|son|mes|tes|ses|leur|aux|du|au)$/;
  if (countMatches(frenchWords) >= 2) return "French";

  // Spanish: require 2+ function words
  const spanishWords = /^(yo|tú|él|ella|nosotros|ellos|ellas|las|los|una?|del|está|están|con|para|pero|como|más|esta|esto|muy|también|donde|cuando|tiene|tienen)$/;
  if (countMatches(spanishWords) >= 2) return "Spanish";

  // German: require 2+ function words
  const germanWords = /^(ich|du|er|sie|wir|ihr|das|die|der|den|dem|des|ein|eine|einen|einem|ist|sind|mit|für|auf|und|aber|oder|nicht|mein|dein|sein|kein|nach|von)$/;
  if (countMatches(germanWords) >= 2) return "German";

  // Portuguese: require 2+ function words
  const portugueseWords = /^(eu|ele|ela|nós|eles|elas|uma?|das|dos|está|estão|são|com|para|mas|como|mais|esta|muito|não|também|onde|quando|tem|têm)$/;
  if (countMatches(portugueseWords) >= 2) return "Portuguese";

  // Italian: require 2+ function words
  const italianWords = /^(io|lui|lei|noi|voi|loro|gli|della|delle|dello|degli|sono|siamo|con|per|che|ma|come|più|questa|questo|molto|non|anche|dove|quando)$/;
  if (countMatches(italianWords) >= 2) return "Italian";

  return "English";
}

export function buildEngineContextMessage(
  playerAction: string,
  engineOutcome: EngineOutcome,
  formattedContext: string,
  contradictionHint?: string,
  languagePreference?: string
): string {
  const parts: string[] = [];

  // Use explicit language preference if set, otherwise auto-detect
  const responseLanguage = (languagePreference && languagePreference.toLowerCase() !== "english")
    ? languagePreference
    : detectPlayerLanguage(playerAction);
  parts.push(`## Response Language\nRespond ENTIRELY in **${responseLanguage}**. Do NOT mix languages. Do NOT infer language from character names, NPC names, location names, or in-game terms.`);

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

  if (o.restEncounter) {
    const enc = o.restEncounter;
    if (enc.interrupted) {
      outcomeParts.push(`REST INTERRUPTED: ${enc.description}. The character's rest was cut short by ${enc.type === "combat" ? "an attack" : "a disturbance"}. They gain NO rest benefits. Narrate the encounter dramatically — they were settling in when danger struck.${enc.type === "combat" && o.damageTaken ? ` They took ${o.damageTaken} damage from the surprise attack.` : ""}`);
    } else {
      outcomeParts.push(`REST EVENT: During the rest, ${enc.description.toLowerCase()}. The rest still succeeds, but narrate this encounter as part of the rest scene.`);
    }
  }
  if (o.restDenied && !o.restEncounter) {
    outcomeParts.push("REST DENIED: The character isn't tired enough to rest. Narrate that they feel restless, too alert, or haven't exerted themselves enough. They need to adventure more before they can settle down.");
  }
  if (o.restType === "long" && !o.restDenied) {
    outcomeParts.push("LONG REST: The character settles in for a full night's rest. Narrate them finding a safe camp, sleeping through the night, and waking refreshed. All HP restored and all abilities recharged.");
  }
  if (o.restType === "short" && !o.restDenied) {
    outcomeParts.push("SHORT REST: The character takes a brief breather (about 1 hour). Narrate them catching their breath, bandaging wounds, and recovering some energy. Short-rest abilities are recharged.");
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
  // Report resource consumption so the DM can reference spell power / exhaustion
  if (o.resourceUpdates) {
    const consumed: string[] = [];
    // Compare with original (if available via roll reason) to detect what was spent
    const slots = o.resourceUpdates.filter((r) =>
      (r.key.startsWith("spell_slot_") || r.key === "pact_slots") && r.current < r.max
    );
    if (slots.length > 0) {
      const slotInfo = slots.map((s) => `${s.label}: ${s.current}/${s.max} remaining`).join(", ");
      consumed.push(`Spell slots after cast: ${slotInfo}`);
    }
    const features = o.resourceUpdates.filter((r) =>
      !r.key.startsWith("spell_slot_") && r.key !== "pact_slots" && r.key !== "hit_dice" && r.current < r.max
    );
    for (const f of features) {
      consumed.push(`${f.label}: ${f.current}/${f.max === Infinity ? "unlimited" : f.max} remaining`);
    }
    if (consumed.length > 0) {
      outcomeParts.push(`RESOURCES USED: ${consumed.join(". ")}. Weave this into the narration subtly — the character draws on their inner power, channeling energy, or feeling the strain of expended magic.`);
    }
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
  if (o.tradeResult) {
    if (o.tradeResult.success) {
      if (o.tradeResult.type === "buy") {
        outcomeParts.push(`TRADE: Player BOUGHT "${o.tradeResult.item}" for ${o.tradeResult.price} gold. Narrate the merchant handing over the item and taking the coin.`);
      } else {
        outcomeParts.push(`TRADE: Player SOLD "${o.tradeResult.item}" for ${o.tradeResult.price} gold. Narrate the merchant inspecting the item and paying.`);
      }
    } else {
      outcomeParts.push(`TRADE FAILED: Player tried to ${o.tradeResult.type} "${o.tradeResult.item}" but failed. Reason: ${o.tradeResult.reason}. Narrate the merchant explaining the issue — not enough gold, item not in stock, etc.`);
    }
  }
  if (o.pickupResult) {
    if (o.pickupResult.success) {
      outcomeParts.push(`PICKUP: Player picked up "${o.pickupResult.item}" from the ground. Narrate them collecting the item — reaching down, scooping it up, inspecting it briefly.`);
    } else {
      outcomeParts.push(`PICKUP FAILED: Player tried to pick up "${o.pickupResult.item}" but failed. ${o.pickupResult.reason ?? "The item isn't here."}. Narrate the character looking around but not finding what they want.`);
    }
  }
  if (o.addToGround && o.addToGround.length > 0) {
    outcomeParts.push(`LOOT DROPPED: The following items fell to the ground: ${o.addToGround.join(", ")}. Mention these items as loot the player can pick up.`);
  }
  if (o.dropResult) {
    if (o.dropResult.success) {
      outcomeParts.push(`DROP: Player dropped "${o.dropResult.item}". Narrate them discarding or leaving the item behind.`);
    } else {
      outcomeParts.push(`DROP FAILED: Player tried to drop "${o.dropResult.item}" but doesn't have it. Narrate the confusion.`);
    }
  }
  if (o.equipItem) {
    outcomeParts.push(`EQUIP: Player equipped "${o.equipItem}". Narrate them readying the item — strapping on armor, gripping a weapon, slipping on a ring, etc.`);
  }
  if (o.identifyItem) {
    outcomeParts.push(`IDENTIFY: Player successfully identified "${o.identifyItem}". Reveal the item's magical properties through narration — a glow, an inscription, a vision.`);
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
