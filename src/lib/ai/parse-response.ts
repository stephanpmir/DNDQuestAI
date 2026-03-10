import type { DMResponsePayload } from "@/types/game";

/**
 * Attempt JSON.parse, also handling Python-style single-quoted dicts.
 */
function tryParseJSON(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }
  // Replace single quotes with double quotes (handles Python dict syntax)
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
 * Parse the AI DM response. Expects JSON, but gracefully handles
 * cases where the model wraps it in markdown fences, adds preamble,
 * or uses non-JSON formatting for the game state update.
 */
export function parseDMResponse(raw: string): DMResponsePayload {
  // Try direct JSON parse first
  const direct = tryParseJSON(raw);
  if (direct && typeof direct === "object" && "narrative" in (direct as Record<string, unknown>)) {
    return direct as DMResponsePayload;
  }

  // Try extracting from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const parsed = tryParseJSON(fenceMatch[1].trim());
    if (parsed && typeof parsed === "object" && "narrative" in (parsed as Record<string, unknown>)) {
      return parsed as DMResponsePayload;
    }
  }

  // Handle inline **gameStateUpdate**: {...} pattern the model sometimes uses
  const inlineMatch = raw.match(/\*{0,2}gameStateUpdate\*{0,2}\s*[:=]\s*(\{[^}]+\})/i);
  if (inlineMatch) {
    const narrative = raw.slice(0, inlineMatch.index).replace(/\n+$/, "").trim();
    const stateObj = tryParseJSON(inlineMatch[1]);
    return {
      narrative,
      gameStateUpdate: (stateObj as DMResponsePayload["gameStateUpdate"]) ?? {},
    };
  }

  // Try finding a full JSON object with "narrative" key
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    const parsed = tryParseJSON(raw.slice(braceStart, braceEnd + 1));
    if (parsed && typeof parsed === "object" && "narrative" in (parsed as Record<string, unknown>)) {
      return parsed as DMResponsePayload;
    }
  }

  // Couldn't parse structured data — return narrative only
  return {
    narrative: raw,
    gameStateUpdate: {},
  };
}
