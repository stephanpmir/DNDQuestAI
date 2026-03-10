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

  // 1. Strip ALL mechanical override statements
  cleaned = stripMechanicalOverrides(cleaned);

  // 2. Strip references to items the player doesn't have
  cleaned = stripPhantomItems(cleaned, character.inventory);

  // 3. Detect and register new NPCs mentioned in the narrative
  const detectedNpcs = detectNewNpcs(cleaned, knownNpcs);
  newNpcs.push(...detectedNpcs);

  // 4. Check for HP/death inconsistencies
  if (character.hp <= 0 &&
    !cleaned.toLowerCase().includes("unconscious") &&
    !cleaned.toLowerCase().includes("fallen") &&
    !cleaned.toLowerCase().includes("dying")) {
    warnings.push("Character should be unconscious at 0 HP");
  }

  // 5. Strip any remaining JSON syntax artifacts
  cleaned = stripSyntaxArtifacts(cleaned);

  return { narrative: cleaned, newNpcs, warnings };
}

/**
 * Strip ALL mechanical override statements from the narrative.
 * The engine controls items, gold, XP, levels, HP — not the LLM.
 */
function stripMechanicalOverrides(narrative: string): string {
  let cleaned = narrative;

  // Gold/coins
  cleaned = cleaned.replace(
    /[*_]*\(?(?:You|The player|Your character)\s+(?:gain|receive|find|pick up|loot|obtain|acquire|earn|get|are awarded|have been granted|collect)\s+\d+\s*(?:gold|gp|GP|coins?|silver|copper|platinum)[^.!]*[.!]\)?[*_]*/gi,
    ""
  );

  // Items
  cleaned = cleaned.replace(
    /[*_]*\(?(?:You|The player)\s+(?:gain|receive|find|pick up|loot|obtain|acquire|get|are awarded|have been granted)\s+(?:a|an|the|some)?\s*[A-Z][\w\s]{1,40}?(?:\.|!)\)?[*_]*/gi,
    ""
  );

  // Levels / XP
  cleaned = cleaned.replace(
    /[*_]*\(?(?:You|The player|Your character)\s+(?:level up|advance|gain|earn|are now|reach|have reached|are awarded)\s+(?:to\s+)?(?:level\s+)?\d+\s*(?:levels?|XP|xp|experience)?[^.!]*[.!]\)?[*_]*/gi,
    ""
  );

  // HP changes declared by narrative
  cleaned = cleaned.replace(
    /[*_]*\(?(?:You|The player)\s+(?:gain|lose|recover|heal|restore|regain)\s+\d+\s*(?:HP|hp|hit points|health)[^.!]*[.!]\)?[*_]*/gi,
    ""
  );

  // "Your inventory now contains..." style
  cleaned = cleaned.replace(
    /[*_]*\(?(?:Your inventory|You now have|Added to inventory)[^.!]*[.!]\)?[*_]*/gi,
    ""
  );

  return cleaned;
}

/**
 * If the LLM references the player "pulling out" or "using" an item
 * they don't have, strip the specific item reference.
 */
function stripPhantomItems(narrative: string, inventory: string[]): string {
  const inventoryLower = new Set(inventory.map((i) => i.toLowerCase()));

  const usePatterns = /(?:you|the \w+)\s+(?:pull out|draw|take out|grab|use|wield|equip|unsheathe|brandish)\s+(?:your |the |a |an )?(\w[\w\s]{1,30}?)(?:\.|,|!|\band\b)/gi;

  return narrative.replace(usePatterns, (match, itemName: string) => {
    const itemLower = itemName.trim().toLowerCase();
    const hasItem = inventoryLower.has(itemLower) ||
      [...inventoryLower].some((inv) => inv.includes(itemLower) || itemLower.includes(inv));
    if (hasItem) return match;
    // Replace phantom item with generic description
    return match.replace(itemName, "weapon");
  });
}

/**
 * Detect NPC names in narrative that aren't in our known NPC list.
 */
function detectNewNpcs(narrative: string, knownNpcs: NPC[]): string[] {
  const knownNames = new Set(knownNpcs.map((n) => n.name.toLowerCase()));
  const newNames: string[] = [];

  const dialoguePattern = /\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?)\s+(?:says|replies|asks|whispers|shouts|exclaims|mutters|growls|laughs|nods|explains|warns|offers|greets|calls|announces|responds)/g;

  let match: RegExpExecArray | null;
  while ((match = dialoguePattern.exec(narrative)) !== null) {
    const name = match[1];
    const skipWords = new Set([
      "the", "you", "your", "they", "she", "he", "someone",
      "something", "everyone", "nobody", "then", "there",
    ]);
    if (skipWords.has(name.toLowerCase())) continue;
    if (!knownNames.has(name.toLowerCase()) && !newNames.includes(name)) {
      newNames.push(name);
    }
  }

  return newNames;
}

/**
 * Strip any remaining JSON/code syntax artifacts from the narrative.
 */
function stripSyntaxArtifacts(text: string): string {
  let cleaned = text;

  // Remove code fences
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Remove gameStateUpdate blocks
  cleaned = cleaned.replace(/\*{0,2}gameStateUpdate\*{0,2}\s*[:=]\s*\{[\s\S]*?\}/gi, "");

  // Remove JSON key-value pairs leaked into prose
  cleaned = cleaned.replace(/"(?:narrative|gameStateUpdate|suggestedActions|mentionedNpcs)"\s*:/gi, "");

  // Remove orphaned JSON brackets
  cleaned = cleaned.replace(/^\s*[{}\[\]]\s*$/gm, "");

  // Collapse excess whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}
