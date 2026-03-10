import type { DMResponsePayload } from "@/types/game";

/**
 * Parse the AI DM response. Expects JSON, but gracefully handles
 * cases where the model wraps it in markdown fences or adds preamble.
 */
export function parseDMResponse(raw: string): DMResponsePayload {
  // Try direct JSON parse first
  try {
    return JSON.parse(raw) as DMResponsePayload;
  } catch {
    // ignore
  }

  // Try extracting from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as DMResponsePayload;
    } catch {
      // ignore
    }
  }

  // Last resort: find the first { ... } block
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(raw.slice(braceStart, braceEnd + 1)) as DMResponsePayload;
    } catch {
      // ignore
    }
  }

  // Couldn't parse structured data — return narrative only
  return {
    narrative: raw,
    gameStateUpdate: {},
  };
}
