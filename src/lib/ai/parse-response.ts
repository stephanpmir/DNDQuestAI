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

interface CheckRequired {
  stat: string;
  skill: string;
  dc: number;
  description: string;
}

interface ParsedDMResponse {
  narrative: string;
  sceneImagePrompt?: string;
  checkRequired?: CheckRequired;
  gameStateUpdate: Record<string, never>;
}

/**
 * Extract narrative text, sceneImagePrompt, and checkRequired from the LLM response.
 * gameStateUpdate is always empty — the engine decides state, not the LLM.
 */
export function parseDMResponse(raw: string): ParsedDMResponse {
  let narrative = "";
  let sceneImagePrompt: string | undefined;
  let checkRequired: CheckRequired | undefined;

  /** Helper: extract fields from a parsed JSON object */
  function extractFields(obj: Record<string, unknown>) {
    if (typeof obj.narrative === "string") narrative = obj.narrative;
    if (typeof obj.sceneImagePrompt === "string") sceneImagePrompt = obj.sceneImagePrompt;
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
  }

  // Try direct JSON parse
  const direct = tryParseJSON(raw);
  if (direct && typeof direct === "object") {
    extractFields(direct as Record<string, unknown>);
  }

  // Try extracting from markdown code fences
  if (!narrative) {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      const parsed = tryParseJSON(fenceMatch[1].trim());
      if (parsed && typeof parsed === "object") {
        extractFields(parsed as Record<string, unknown>);
      }
      // If JSON parse failed but the fence contains a "narrative" key,
      // try to extract the value with a regex
      if (!narrative) {
        const narMatch = fenceMatch[1].match(/"narrative"\s*:\s*"([\s\S]*?)"\s*[,}]/);
        if (narMatch) {
          narrative = narMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
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
        extractFields(parsed as Record<string, unknown>);
      }
    }
  }

  // Last resort: use raw text but strip any JSON/syntax artifacts
  if (!narrative) {
    // Try extracting narrative value even from malformed JSON
    const narRegex = /"narrative"\s*:\s*"([\s\S]*?)"\s*[,}]/;
    const narFallback = raw.match(narRegex);
    if (narFallback) {
      narrative = narFallback[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    } else {
      narrative = raw;
    }
  }

  // Try extracting sceneImagePrompt via regex if not found yet
  if (!sceneImagePrompt) {
    const sipMatch = raw.match(/"sceneImagePrompt"\s*:\s*"([^"]{10,200})"/);
    if (sipMatch) sceneImagePrompt = sipMatch[1];
  }

  // Clean the narrative of any syntax artifacts
  narrative = cleanNarrative(narrative);

  return { narrative, sceneImagePrompt, checkRequired, gameStateUpdate: {} };
}

/**
 * Strip JSON syntax, code fences, gameStateUpdate blocks, markdown
 * artifacts, and mechanical override text from the narrative.
 */
function cleanNarrative(text: string): string {
  let cleaned = text;

  // Remove preamble text before code fences (e.g. "Response JSON", "Here is the response:")
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/^[\s\S]*?(?=```)/, "");
  }

  // Remove code fences and their contents if they contain JSON
  cleaned = cleaned.replace(/```(?:json)?[\s\S]*?```/g, "");

  // Remove non-narrative label lines the LLM echoes from system/context messages.
  // Covers all section headers from the system prompt and engine context messages.
  const labelPatterns = [
    "engine\\s*outcome", "response\\s*(?:json|format|language)", "critical\\s*rules",
    "permanent\\s*facts", "context\\s*window", "current\\s*state", "player\\s*(?:character|action)",
    "campaign\\s*tone", "mandatory\\s*escalation", "here\\s*is\\s*(?:my|the)\\s*response",
    "json\\s*response", "narrative\\s*(?:response)?", "dm\\s*response",
    "dice\\s*roll", "hp\\s*change", "items?\\s*(?:gained|lost)", "gold\\s*change",
    "xp\\s*gained", "location\\s*change", "new\\s*quest", "quest\\s*completed",
    "rest\\s*(?:interrupted|event|denied)", "(?:long|short)\\s*rest", "death\\s*save",
    "damage\\s*(?:dealt|taken)", "item\\s*not\\s*found", "karma\\s*shift",
    "divine\\s*intervention", "action\\s*denied", "resources?\\s*used",
    "travel\\s*encounter", "guard\\s*(?:investigation|confrontation)",
    "trade(?:\\s*failed)?", "pickup(?:\\s*failed)?", "loot\\s*dropped",
    "drop(?:\\s*failed)?", "equip\\s*:", "identify\\s*:",
  ].join("|");
  const labelRegex = new RegExp(`^\\s*(?:#{1,6}\\s*)?(?:${labelPatterns})[^\\n]*$`, "gim");
  cleaned = cleaned.replace(labelRegex, "");

  // Catch-all: lines that look like engine directives (ALL CAPS label followed by colon)
  // e.g. "REST DENIED: The character..." or "TRADE FAILED: Player tried..."
  cleaned = cleaned.replace(/^\s*[A-Z][A-Z _]{3,}:\s.*$/gm, "");

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

  // Remove sceneImagePrompt values leaked into prose (key + quoted value)
  cleaned = cleaned.replace(/\*{0,2}sceneImagePrompt\*{0,2}\s*[:=]\s*"[^"]*"/gi, "");
  // Remove checkRequired objects leaked into prose
  cleaned = cleaned.replace(/\*{0,2}checkRequired\*{0,2}\s*[:=]\s*\{[^}]*\}/gi, "");

  // Remove stray JSON keys that leaked into prose
  cleaned = cleaned.replace(/"(?:narrative|sceneImagePrompt|checkRequired|gameStateUpdate|suggestedActions|mentionedNpcs|locationDescription)"\s*:/gi, "");

  // Remove markdown headers like #narrative, ## narrative, ### DM, etc.
  cleaned = cleaned.replace(/^#{1,6}\s*(?:narrative|dm)\b[^\n]*/gim, "");

  // Remove standalone "DM" label lines
  cleaned = cleaned.replace(/^\s*DM\s*$/gm, "");

  // Strip markdown formatting (**, __, ##) from narrative prose
  cleaned = cleaned.replace(/#{1,6}\s+/g, "");
  cleaned = cleaned.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
  cleaned = cleaned.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");

  // Remove orphaned braces/brackets from stripped JSON
  cleaned = cleaned.replace(/^\s*[{}\[\]]\s*$/gm, "");

  // Remove trailing commas left from stripped content
  cleaned = cleaned.replace(/,\s*$/gm, "");

  // Remove suggested actions lists that leaked through
  // e.g. "1. Attack the goblin\n2. Sneak past\n3. Negotiate"
  cleaned = cleaned.replace(/\n\s*(?:\d+\.\s+(?:You could|Attack|Sneak|Talk|Rest|Explore|Search|Go|Move|Try|Use|Cast|Check)[^\n]{5,}\n?){2,}/gi, "");
  // e.g. "- Attack the goblin\n- Sneak past\n- Negotiate"
  cleaned = cleaned.replace(/\n\s*(?:[-*]\s+(?:You could|Attack|Sneak|Talk|Rest|Explore|Search|Go|Move|Try|Use|Cast|Check)[^\n]{5,}\n?){2,}/gi, "");
  // "What do you do?" / "You could..." trailing prompts
  cleaned = cleaned.replace(/\n\s*(?:What (?:do you|will you|would you)[^?]*\??)\s*$/i, "");
  cleaned = cleaned.replace(/\n\s*(?:You (?:could|can|might|may):?)\s*$/i, "");

  // Remove state preamble at the start (e.g. "As a level 5 Fighter with 30 HP...")
  cleaned = cleaned.replace(/^(?:As (?:a|an) (?:level \d+|Lv\.? ?\d+)[\s\S]{0,100}?(?:\.\s))/i, "");
  cleaned = cleaned.replace(/^(?:Currently (?:at|in|with)[\s\S]{0,80}?(?:\.\s))/i, "");
  cleaned = cleaned.replace(/^(?:With (?:your|an?) (?:HP|health|hit points)[\s\S]{0,80}?(?:\.\s))/i, "");

  // Collapse multiple blank lines into one
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}
