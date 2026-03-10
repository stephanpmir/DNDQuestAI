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
 * Normalize non-standard keys the model sometimes uses in gameStateUpdate.
 */
function normalizeGameState(
  obj: Record<string, unknown>
): DMResponsePayload["gameStateUpdate"] {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Map non-standard keys to our schema
    if (key === "inventory" || key === "addItems" || key === "items") {
      result.newItems = value;
    } else if (key === "location" || key === "newLocation") {
      result.locationChange = value;
    } else if (key === "quest" || key === "addQuest") {
      result.newQuest = value;
    } else if (key === "hp" && typeof value === "number") {
      result.hpChange = value;
    } else if (key === "gold" && typeof value === "number") {
      result.goldChange = value;
    } else if (key === "xp" && typeof value === "number") {
      result.xpGained = value;
    } else {
      result[key] = value;
    }
  }
  return result as DMResponsePayload["gameStateUpdate"];
}

/**
 * Parse the AI DM response. Expects JSON, but gracefully handles
 * cases where the model wraps it in markdown fences, adds preamble,
 * or uses non-JSON formatting for the game state update.
 */
function normalizePayload(obj: Record<string, unknown>): DMResponsePayload {
  const payload = obj as unknown as DMResponsePayload;
  if (payload.gameStateUpdate && typeof payload.gameStateUpdate === "object") {
    payload.gameStateUpdate = normalizeGameState(
      payload.gameStateUpdate as unknown as Record<string, unknown>
    );
  }
  return payload;
}

export function parseDMResponse(raw: string): DMResponsePayload {
  // Try direct JSON parse first
  const direct = tryParseJSON(raw);
  if (direct && typeof direct === "object" && "narrative" in (direct as Record<string, unknown>)) {
    return normalizePayload(direct as Record<string, unknown>);
  }

  // Try extracting from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const parsed = tryParseJSON(fenceMatch[1].trim());
    if (parsed && typeof parsed === "object" && "narrative" in (parsed as Record<string, unknown>)) {
      return normalizePayload(parsed as Record<string, unknown>);
    }
  }

  // Handle inline **gameStateUpdate**: {...} pattern the model sometimes uses
  const inlineMatch = raw.match(/\*{0,2}gameStateUpdate\*{0,2}\s*[:=]\s*(\{[\s\S]*\})/i);
  if (inlineMatch) {
    const narrative = raw.slice(0, inlineMatch.index).replace(/\n+$/, "").trim();
    const stateObj = tryParseJSON(inlineMatch[1]);
    return {
      narrative,
      gameStateUpdate: stateObj
        ? normalizeGameState(stateObj as Record<string, unknown>)
        : {},
    };
  }

  // Try finding a full JSON object with "narrative" key
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    const parsed = tryParseJSON(raw.slice(braceStart, braceEnd + 1));
    if (parsed && typeof parsed === "object" && "narrative" in (parsed as Record<string, unknown>)) {
      return normalizePayload(parsed as Record<string, unknown>);
    }
  }

  // Couldn't parse structured data — return narrative only
  return {
    narrative: raw,
    gameStateUpdate: {},
  };
}
