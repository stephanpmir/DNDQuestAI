/**
 * Parse the LLM response and extract ONLY the narrative text.
 *
 * Critical: The LLM is the NARRATOR, not the game master. We extract
 * narrative text only. All gameStateUpdate, items, gold, XP, etc. come
 * from the rules engine, never from the LLM. Any mechanical data the
 * LLM tries to include is discarded.
 */

/**
 * Attempt JSON.parse, also handling Python-style single-quoted dicts.
 */
function tryParseJSON(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }
  try {
    const fixed = text
      .replace(/'/g, '"')
      .replace(/None/g, "null")
      .replace(/True/g, "true")
      .replace(/False/g, "false");
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Extract narrative text from the LLM response.
 * Returns ONLY { narrative, gameStateUpdate: {} }.
 * gameStateUpdate is always empty — the engine decides state, not the LLM.
 */
export function parseDMResponse(raw: string): { narrative: string; gameStateUpdate: Record<string, never> } {
  let narrative = "";

  // Try direct JSON parse — extract "narrative" field only
  const direct = tryParseJSON(raw);
  if (direct && typeof direct === "object") {
    const obj = direct as Record<string, unknown>;
    if (typeof obj.narrative === "string") {
      narrative = obj.narrative;
    }
  }

  // Try extracting from markdown code fences
  if (!narrative) {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      const parsed = tryParseJSON(fenceMatch[1].trim());
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.narrative === "string") {
          narrative = obj.narrative;
        }
      }
    }
  }

  // Try finding a JSON object with "narrative" key in the raw text
  if (!narrative) {
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      const parsed = tryParseJSON(raw.slice(braceStart, braceEnd + 1));
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.narrative === "string") {
          narrative = obj.narrative;
        }
      }
    }
  }

  // Last resort: use raw text but strip any JSON/syntax artifacts
  if (!narrative) {
    narrative = raw;
  }

  // Clean the narrative of any syntax artifacts
  narrative = cleanNarrative(narrative);

  return { narrative, gameStateUpdate: {} };
}

/**
 * Strip JSON syntax, code fences, gameStateUpdate blocks, markdown
 * artifacts, and mechanical override text from the narrative.
 */
function cleanNarrative(text: string): string {
  let cleaned = text;

  // Remove code fences and their contents if they contain JSON
  cleaned = cleaned.replace(/```(?:json)?[\s\S]*?```/g, "");

  // Remove inline gameStateUpdate blocks (any format)
  cleaned = cleaned.replace(/\*{0,2}gameStateUpdate\*{0,2}\s*[:=]\s*\{[\s\S]*?\}/gi, "");
  cleaned = cleaned.replace(/\*{0,2}game_state_update\*{0,2}\s*[:=]\s*\{[\s\S]*?\}/gi, "");

  // Remove suggestedActions / mentionedNpcs JSON arrays leaked into text
  cleaned = cleaned.replace(/\*{0,2}suggestedActions\*{0,2}\s*[:=]\s*\[[\s\S]*?\]/gi, "");
  cleaned = cleaned.replace(/\*{0,2}mentionedNpcs\*{0,2}\s*[:=]\s*\[[\s\S]*?\]/gi, "");
  cleaned = cleaned.replace(/\*{0,2}locationDescription\*{0,2}\s*[:=]\s*"[^"]*"/gi, "");

  // Remove mechanical override statements the LLM shouldn't make
  // Items, gold, XP, levels, HP — the engine controls all of these
  cleaned = cleaned.replace(
    /\n?[*_]*\(?(?:You|Player)[\s:]*(?:gain|receive|find|pick up|loot|obtain|acquire|earn|get|are awarded|have been granted|level up to|advance to|reach level|are now level)\s+[\s\S]{1,80}?(?:\.|!|\))\)?[*_]*/gi,
    ""
  );

  // Remove stray JSON keys that leaked into prose
  cleaned = cleaned.replace(/"(?:narrative|gameStateUpdate|suggestedActions|mentionedNpcs|locationDescription)"\s*:/gi, "");

  // Remove orphaned braces/brackets from stripped JSON
  cleaned = cleaned.replace(/^\s*[{}\[\]]\s*$/gm, "");

  // Remove trailing commas left from stripped content
  cleaned = cleaned.replace(/,\s*$/gm, "");

  // Collapse multiple blank lines into one
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}
