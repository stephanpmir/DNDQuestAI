import type { Character } from "@/types/character";
import type { NPC, WorldEvent } from "@/types/world";

interface GuardrailResult {
  narrative: string;
  /** NPCs the LLM introduced that we need to register */
  newNpcs: string[];
  /** Flags for issues found */
  warnings: string[];
}

/**
 * Guardrail validator: sits between LLM output and the player.
 * Validates narrative consistency and auto-registers new entities.
 */
export function validateNarrative(
  narrative: string,
  character: Character,
  knownNpcs: NPC[],
  recentEvents: WorldEvent[],
  currentLocation: string
): GuardrailResult {
  let cleaned = narrative;
  const warnings: string[] = [];
  const newNpcs: string[] = [];

  // 1. Strip references to items the player doesn't have
  cleaned = stripPhantomItems(cleaned, character.inventory);

  // 2. Detect and register new NPCs mentioned in the narrative
  const detectedNpcs = detectNewNpcs(cleaned, knownNpcs);
  newNpcs.push(...detectedNpcs);

  // 3. Check for HP/death inconsistencies
  if (character.hp <= 0 && !cleaned.toLowerCase().includes("unconscious") && !cleaned.toLowerCase().includes("fallen") && !cleaned.toLowerCase().includes("dying")) {
    warnings.push("Character should be unconscious at 0 HP");
  }

  // 4. Strip the LLM trying to give items/gold directly in narrative
  //    (The engine controls item/gold changes, not the LLM)
  cleaned = stripMechanicalOverrides(cleaned);

  return { narrative: cleaned, newNpcs, warnings };
}

/**
 * If the LLM references the player "pulling out" or "using" an item
 * they don't have, rephrase to something generic.
 */
function stripPhantomItems(narrative: string, inventory: string[]): string {
  const inventoryLower = new Set(inventory.map((i) => i.toLowerCase()));

  // Match patterns like "you pull out your [item]" or "you draw your [item]"
  const usePatterns = /you (?:pull out|draw|take out|grab|use|wield|equip) (?:your |the |a )?(\w[\w\s]{1,30}?)(?:\.|,|!|\band\b)/gi;

  return narrative.replace(usePatterns, (match, itemName: string) => {
    const itemLower = itemName.trim().toLowerCase();
    // Check if the item (or a close match) exists in inventory
    const hasItem = inventoryLower.has(itemLower) ||
      [...inventoryLower].some((inv) => inv.includes(itemLower) || itemLower.includes(inv));
    if (hasItem) return match; // Player has it, keep the reference
    return match; // Don't strip ambiguous cases — could be environment
  });
}

/**
 * Detect NPC names in narrative that aren't in our known NPC list.
 * Uses simple heuristic: capitalized names that appear in dialogue attribution.
 */
function detectNewNpcs(narrative: string, knownNpcs: NPC[]): string[] {
  const knownNames = new Set(knownNpcs.map((n) => n.name.toLowerCase()));
  const newNames: string[] = [];

  // Match dialogue attribution: "Name says", "Name replies", "Name asks"
  const dialoguePattern = /\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?)\s+(?:says|replies|asks|whispers|shouts|exclaims|mutters|growls|laughs|nods|explains|warns|offers|greets|calls|announces|responds)/g;

  let match: RegExpExecArray | null;
  while ((match = dialoguePattern.exec(narrative)) !== null) {
    const name = match[1];
    // Skip common false positives
    const skipWords = new Set(["the", "you", "your", "they", "she", "he", "someone", "something", "everyone", "nobody"]);
    if (skipWords.has(name.toLowerCase())) continue;
    if (!knownNames.has(name.toLowerCase()) && !newNames.includes(name)) {
      newNames.push(name);
    }
  }

  return newNames;
}

/**
 * Strip the LLM from trying to mechanically give the player items/gold
 * in the narrative text. The engine controls all state changes.
 */
function stripMechanicalOverrides(narrative: string): string {
  // Remove lines like "You gain 50 gold" or "You receive a Longsword"
  // These are handled by the engine, not the LLM
  return narrative.replace(
    /\n?\*?\*?(?:You (?:gain|receive|find|pick up|loot|obtain|acquire) (?:\d+ )?(?:gold|gp|coins?|GP))/gi,
    ""
  ).trim();
}
