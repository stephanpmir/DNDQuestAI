/**
 * Parse the LLM response using bracket-delimiter format.
 *
 * The LLM outputs clean narrative text first, followed by structured fields
 * on their own lines using [TAG] delimiters. Everything before the first
 * [TAG] is the narrative shown to the player.
 *
 * Supported tags:
 *   [SCENE_IMAGE_PROMPT] — scene description for image generation
 *   [CHECK_REQUIRED]     — JSON object: { stat, skill, dc, description }
 *   [HP]                 — integer HP change (e.g. -5 or +3)
 *   [XP]                 — integer XP gained
 *   [GOLD]               — integer gold change
 *   [LOCATION]           — new location name
 *   [KARMA]              — integer karma shift
 *   [FAME]               — integer fame change
 *   [AC]                 — integer AC value
 *   [WORN]               — pipe-delimited worn items
 *   [BACKPACK]           — pipe-delimited backpack items
 *   [RESOURCES]          — pipe-delimited resources
 *   [CRIMES]             — pipe-delimited crimes
 */

interface CheckRequired {
  stat: string;
  skill: string;
  dc: number;
  description: string;
}

export interface ParsedDMResponse {
  narrative: string;
  sceneImagePrompt?: string;
  checkRequired?: CheckRequired;
  gameStateUpdate: Record<string, never>;
}

/**
 * All recognized bracket tags. Order doesn't matter — we split on any of them.
 */
const TAGS = [
  "SCENE_IMAGE_PROMPT",
  "CHECK_REQUIRED",
  "HP",
  "XP",
  "GOLD",
  "LOCATION",
  "KARMA",
  "FAME",
  "AC",
  "WORN",
  "BACKPACK",
  "RESOURCES",
  "CRIMES",
] as const;

/**
 * Regex that matches any [TAG] at the start of a line (with optional whitespace).
 * Captures the tag name.
 */
const TAG_LINE_REGEX = new RegExp(
  `^\\s*\\[(${TAGS.join("|")})\\]\\s*`,
  "m"
);

/**
 * Parse the LLM response. Everything before the first [TAG] line is the
 * narrative. Each [TAG] value runs until the next [TAG] or end of string.
 */
export function parseDMResponse(raw: string): ParsedDMResponse {
  console.log("[parseDMResponse] RAW LLM output:", raw);

  // First, try to handle the case where the LLM still outputs JSON despite instructions
  const jsonFallback = tryExtractFromJSON(raw);
  if (jsonFallback) {
    console.log("[parseDMResponse] JSON fallback used — sceneImagePrompt:", jsonFallback.sceneImagePrompt ?? "NONE");
    return jsonFallback;
  }

  const fields = new Map<string, string>();

  // Find the first tag to split narrative from structured data
  const firstTagMatch = raw.match(TAG_LINE_REGEX);
  let narrative: string;
  let remainder: string;

  if (firstTagMatch && firstTagMatch.index !== undefined) {
    narrative = raw.slice(0, firstTagMatch.index);
    remainder = raw.slice(firstTagMatch.index);
  } else {
    // No tags found — entire response is narrative
    narrative = raw;
    remainder = "";
  }

  // Parse each [TAG] value from the remainder
  if (remainder) {
    const tagSplitRegex = new RegExp(
      `\\[(?:${TAGS.join("|")})\\]`,
      "g"
    );
    const tagNames: string[] = [];
    const tagPositions: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = tagSplitRegex.exec(remainder)) !== null) {
      const tagName = match[0].slice(1, -1); // strip [ and ]
      tagNames.push(tagName);
      tagPositions.push(match.index + match[0].length);
    }

    for (let i = 0; i < tagNames.length; i++) {
      const start = tagPositions[i];
      const end = i + 1 < tagNames.length
        ? remainder.lastIndexOf("[", tagPositions[i + 1])
        : remainder.length;
      const value = remainder.slice(start, end).trim();
      if (value) {
        fields.set(tagNames[i], value);
      }
    }
  }

  // Extract structured fields
  const sceneImagePrompt = fields.get("SCENE_IMAGE_PROMPT") || undefined;

  let checkRequired: CheckRequired | undefined;
  const crRaw = fields.get("CHECK_REQUIRED");
  if (crRaw) {
    checkRequired = parseCheckRequired(crRaw);
  }

  console.log("[parseDMResponse] Parsed fields:", [...fields.keys()].join(", ") || "NONE");
  console.log("[parseDMResponse] sceneImagePrompt:", sceneImagePrompt ?? "NONE");
  console.log("[parseDMResponse] firstTagMatch found:", !!raw.match(TAG_LINE_REGEX));

  // Clean narrative
  narrative = cleanNarrative(narrative);

  return { narrative, sceneImagePrompt, checkRequired, gameStateUpdate: {} };
}

/**
 * Try to parse checkRequired from a JSON string or key-value text.
 */
function parseCheckRequired(raw: string): CheckRequired | undefined {
  // Try JSON parse first
  try {
    const obj = JSON.parse(raw);
    if (typeof obj.stat === "string" && typeof obj.skill === "string" && typeof obj.dc === "number") {
      return {
        stat: obj.stat,
        skill: obj.skill,
        dc: obj.dc,
        description: typeof obj.description === "string" ? obj.description : "",
      };
    }
  } catch {
    // Try fixing Python-style quotes
    try {
      const fixed = raw
        .replace(/'/g, '"')
        .replace(/None/g, "null")
        .replace(/True/g, "true")
        .replace(/False/g, "false");
      const obj = JSON.parse(fixed);
      if (typeof obj.stat === "string" && typeof obj.skill === "string" && typeof obj.dc === "number") {
        return {
          stat: obj.stat,
          skill: obj.skill,
          dc: obj.dc,
          description: typeof obj.description === "string" ? obj.description : "",
        };
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

/**
 * Fallback: if the LLM ignores bracket instructions and outputs JSON,
 * try to extract narrative/sceneImagePrompt/checkRequired from it.
 */
function tryExtractFromJSON(raw: string): ParsedDMResponse | null {
  const trimmed = raw.trim();

  // Only attempt if response looks like JSON (starts with { or has code fence)
  let jsonStr: string | null = null;

  if (trimmed.startsWith("{")) {
    jsonStr = trimmed;
  } else {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const braceStart = trimmed.indexOf("{");
      const braceEnd = trimmed.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd > braceStart) {
        // Only use this if the content before the brace is short (likely preamble)
        const beforeBrace = trimmed.slice(0, braceStart).trim();
        if (beforeBrace.length < 100) {
          jsonStr = trimmed.slice(braceStart, braceEnd + 1);
        }
      }
    }
  }

  if (!jsonStr) return null;

  try {
    const obj = JSON.parse(jsonStr);
    if (typeof obj.narrative === "string") {
      let checkRequired: CheckRequired | undefined;
      if (obj.checkRequired && typeof obj.checkRequired === "object") {
        const cr = obj.checkRequired as Record<string, unknown>;
        if (typeof cr.stat === "string" && typeof cr.skill === "string" && typeof cr.dc === "number") {
          checkRequired = {
            stat: cr.stat,
            skill: cr.skill,
            dc: cr.dc,
            description: typeof cr.description === "string" ? cr.description : "",
          };
        }
      }
      return {
        narrative: cleanNarrative(obj.narrative),
        sceneImagePrompt: typeof obj.sceneImagePrompt === "string" ? obj.sceneImagePrompt : undefined,
        checkRequired,
        gameStateUpdate: {},
      };
    }
  } catch {
    // Not valid JSON — fall through to bracket parsing
  }

  return null;
}

/**
 * Strip leftover JSON syntax, code fences, markdown formatting, engine
 * directives, and mechanical override text from the narrative.
 */
function cleanNarrative(text: string): string {
  let cleaned = text;

  // Remove code fences and their contents if they contain JSON
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/^[\s\S]*?(?=```)/, "");
    cleaned = cleaned.replace(/```(?:json)?[\s\S]*?```/g, "");
  }

  // Remove any stray [TAG] lines that leaked into narrative portion (known tags)
  const tagPattern = new RegExp(
    `^\\s*\\[(?:${TAGS.join("|")})\\].*$`,
    "gm"
  );
  cleaned = cleaned.replace(tagPattern, "");

  // Strip ALL unknown bracket tags the LLM may invent (e.g. [LIPICONSHIELD])
  // Matches [ANY_CAPS_TAG] followed by content until newline
  cleaned = cleaned.replace(/\[[A-Z_]+\][^\n]*/g, "");

  // Remove bracketed stage directions the LLM may embed in the narrative
  // e.g. "[The market square bustles with merchants]" or "[A dark cave looms ahead]"
  cleaned = cleaned.replace(/\[(?![A-Z_]{3,}\])[^\]]{5,200}\]/g, "");

  // Remove non-narrative label lines the LLM echoes
  const labelPatterns = [
    "engine\\s*outcome", "response\\s*(?:json|format|language)", "critical\\s*rules",
    "permanent\\s*facts", "context\\s*window", "current\\s*state", "player\\s*(?:character|action)",
    "campaign\\s*tone", "mandatory\\s*escalation", "here\\s*is\\s*(?:my|the)\\s*response",
    "json\\s*response", "narrative\\s*(?:response)?", "dm\\s*response",
  ].join("|");
  const labelRegex = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:${labelPatterns})[^\\n]*$`, "gim");
  cleaned = cleaned.replace(labelRegex, "");

  // Catch-all: ALL CAPS directive lines
  cleaned = cleaned.replace(/^\s*[A-Z][A-Z _]{3,}:\s.*$/gm, "");

  // Remove inline gameStateUpdate blocks
  cleaned = cleaned.replace(/\*{0,2}gameStateUpdate\*{0,2}\s*[:=]\s*\{[\s\S]*?\}/gi, "");
  cleaned = cleaned.replace(/\*{0,2}game_state_update\*{0,2}\s*[:=]\s*\{[\s\S]*?\}/gi, "");

  // Remove suggestedActions / mentionedNpcs JSON arrays leaked into text
  cleaned = cleaned.replace(/\*{0,2}suggestedActions\*{0,2}\s*[:=]\s*\[[\s\S]*?\]/gi, "");
  cleaned = cleaned.replace(/\*{0,2}mentionedNpcs\*{0,2}\s*[:=]\s*\[[\s\S]*?\]/gi, "");
  cleaned = cleaned.replace(/\*{0,2}locationDescription\*{0,2}\s*[:=]\s*"[^"]*"/gi, "");

  // Remove mechanical override statements
  cleaned = cleaned.replace(
    /\n?[*_]*\(?(?:You|Player)[\s:]*(?:gain|receive|find|pick up|loot|obtain|acquire|earn|get|are awarded|have been granted|level up to|advance to|reach level|are now level)\s+[\s\S]{1,80}?(?:\.|\!|\))\)?[*_]*/gi,
    ""
  );

  // Remove sceneImagePrompt/checkRequired values leaked into prose
  cleaned = cleaned.replace(/\*{0,2}sceneImagePrompt\*{0,2}\s*[:=]\s*"[^"]*"/gi, "");
  cleaned = cleaned.replace(/\*{0,2}checkRequired\*{0,2}\s*[:=]\s*\{[^}]*\}/gi, "");

  // Remove stray JSON keys
  cleaned = cleaned.replace(/"(?:narrative|sceneImagePrompt|checkRequired|gameStateUpdate|suggestedActions|mentionedNpcs|locationDescription)"\s*:/gi, "");

  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s*(?:narrative|dm)\b[^\n]*/gim, "");
  cleaned = cleaned.replace(/^\s*DM\s*$/gm, "");

  // Strip markdown formatting
  cleaned = cleaned.replace(/#{1,6}\s+/g, "");
  cleaned = cleaned.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
  cleaned = cleaned.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");

  // Remove orphaned braces/brackets
  cleaned = cleaned.replace(/^\s*[{}\[\]]\s*$/gm, "");

  // Remove trailing commas
  cleaned = cleaned.replace(/,\s*$/gm, "");

  // Remove suggested actions lists
  cleaned = cleaned.replace(/\n\s*(?:\d+\.\s+(?:You could|Attack|Sneak|Talk|Rest|Explore|Search|Go|Move|Try|Use|Cast|Check)[^\n]{5,}\n?){2,}/gi, "");
  cleaned = cleaned.replace(/\n\s*(?:[-*]\s+(?:You could|Attack|Sneak|Talk|Rest|Explore|Search|Go|Move|Try|Use|Cast|Check)[^\n]{5,}\n?){2,}/gi, "");
  cleaned = cleaned.replace(/\n\s*(?:What (?:do you|will you|would you)[^?]*\??)\s*$/i, "");
  cleaned = cleaned.replace(/\n\s*(?:You (?:could|can|might|may):?)\s*$/i, "");

  // Remove state preamble
  cleaned = cleaned.replace(/^(?:As (?:a|an) (?:level \d+|Lv\.? ?\d+)[\s\S]{0,100}?(?:\.\s))/i, "");
  cleaned = cleaned.replace(/^(?:Currently (?:at|in|with)[\s\S]{0,80}?(?:\.\s))/i, "");
  cleaned = cleaned.replace(/^(?:With (?:your|an?) (?:HP|health|hit points)[\s\S]{0,80}?(?:\.\s))/i, "");

  // Collapse multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}
