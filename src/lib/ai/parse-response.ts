/**
 * Parse the LLM response using bracket-delimiter format.
 *
 * The LLM outputs clean narrative text first, followed by structured fields
 * on their own lines using [TAG] delimiters. Everything before the first
 * [TAG] is the narrative shown to the player.
 *
 * Supported tags:
 *   [GENERATE_IMAGE]     — scene description for image generation (only on trigger events)
 *   [SCENE_IMAGE_PROMPT] — legacy alias for [GENERATE_IMAGE]
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
  "GENERATE_IMAGE",
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
  "COMBAT_START",
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
  // First, try to handle the case where the LLM still outputs JSON despite instructions
  const jsonFallback = tryExtractFromJSON(raw);
  if (jsonFallback) return jsonFallback;

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

  // Extract structured fields — prefer GENERATE_IMAGE, fall back to SCENE_IMAGE_PROMPT
  const rawScenePrompt = fields.get("GENERATE_IMAGE") || fields.get("SCENE_IMAGE_PROMPT") || undefined;
  const sceneImagePrompt = rawScenePrompt ? sanitizeScenePrompt(rawScenePrompt) : undefined;

  let checkRequired: CheckRequired | undefined;
  const crRaw = fields.get("CHECK_REQUIRED");
  if (crRaw) {
    checkRequired = parseCheckRequired(crRaw);
  }

  // Clean narrative
  narrative = cleanNarrative(narrative);

  return { narrative, sceneImagePrompt, checkRequired, gameStateUpdate: {} };
}

// ── Fix 1: Hard HP guard — combat state tracking ─────────────────
let _combatActive = false;

/** Mark combat as started (called when COMBAT_START tag is detected). */
export function markCombatStarted(): void {
  _combatActive = true;
}

/** Mark combat as ended (call when enemy is defeated or player flees). */
export function markCombatEnded(): void {
  _combatActive = false;
}

/** Returns true if combat is currently active. */
export function isCombatActive(): boolean {
  return _combatActive;
}

/**
 * HP guard: block HP decrease when no combat is active.
 * Returns the safe HP value and logs if it was blocked.
 */
export function guardHpChange(
  previousHp: number,
  newHp: number,
  rawResponse: string,
): number {
  if (newHp >= previousHp) return newHp; // HP stayed or increased — always allowed
  const hasCombatTag = /\[COMBAT_START\]/i.test(rawResponse);
  const hasDamageTag = /\[DAMAGE\]/i.test(rawResponse);
  if (_combatActive || hasCombatTag || hasDamageTag) {
    if (hasCombatTag) markCombatStarted();
    return newHp; // combat active — HP decrease allowed
  }
  console.warn("[parse-response] HP change blocked — no combat active");
  return previousHp;
}

// ── Fix 2: Location extraction with movement detection ───────────
const MOVEMENT_PATTERNS = [
  /\bentered\b/i, /\barrived\b/i, /\breached\b/i, /\bemerged\b/i,
  /\bstepped\s+into\b/i, /\bmade\s+your\s+way\s+to\b/i,
  /\bfound\s+yourself\s+in\b/i, /\bwalked\s+to\b/i, /\bheaded\s+toward\b/i,
];

/**
 * If the narrative describes the player moving to a new place but the
 * location tag did not change, extract the new location from the last
 * 1-2 sentences and return it as an override.  Returns null if no
 * movement detected or location already changed.
 */
export function detectMovementLocation(
  narrative: string,
  previousLocation: string,
  currentLocationTag: string | undefined,
): string | null {
  // If location tag already changed, no override needed
  if (currentLocationTag && currentLocationTag.toLowerCase() !== previousLocation.toLowerCase()) {
    return null;
  }
  const mentionsMovement = MOVEMENT_PATTERNS.some(p => p.test(narrative));
  if (!mentionsMovement) return null;

  // Extract from last 1-2 sentences
  const sentences = narrative.replace(/\n/g, " ").split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const lastSentences = sentences.slice(-2).join(" ");

  // Try to extract a location name after movement verbs
  const locationExtractors = [
    /(?:entered|arrived\s+at|reached|emerged\s+into|stepped\s+into|found\s+yourself\s+in|walked\s+to|headed\s+toward|made\s+your\s+way\s+to)\s+(?:the\s+)?(.{3,60}?)(?:\.|,|!|\?|$)/i,
  ];

  for (const regex of locationExtractors) {
    const match = lastSentences.match(regex);
    if (match?.[1]) {
      // Capitalize and clean
      const loc = match[1].trim().replace(/\s+/g, " ");
      // Title case
      const titled = loc.replace(/\b\w/g, c => c.toUpperCase());
      return titled;
    }
  }

  return null;
}

// ── Fix 3: Force loot after successful checks DC >= 12 ───────────
const LOOT_TABLE_ITEMS = [
  "Potion of Healing",
  "Set of Lockpicks",
  "Silver Ring",
  "Torch",
  "Antitoxin",
];

/**
 * After a successful skill check at DC 12+, enforce loot rewards.
 * Returns { goldBonus, itemDrop } — call site must apply them.
 */
export function enforceLootReward(
  checkDc: number,
  checkSucceeded: boolean,
  goldChangedThisTurn: boolean,
): { goldBonus: number; itemDrop: string | null } {
  if (!checkSucceeded || checkDc < 12) {
    return { goldBonus: 0, itemDrop: null };
  }

  const goldBonus = goldChangedThisTurn ? 0 : Math.floor(Math.random() * 11) + 5; // 5-15

  // 40% chance to drop an item
  const itemDrop = Math.random() < 0.4
    ? LOOT_TABLE_ITEMS[Math.floor(Math.random() * LOOT_TABLE_ITEMS.length)]
    : null;

  return { goldBonus, itemDrop };
}

// ── Fix 5: Server-side combat injection after 5 safe turns ───────
let _turnsWithoutCombat = 0;

const SAFE_LOCATIONS = ["tavern", "inn", "shop", "market square", "town hall"];
const DANGEROUS_LOCATIONS = ["forest", "alley", "docks", "warehouse", "dungeon", "ruins"];

const AMBUSH_SCENES: { narrative: string; enemy: string; cr: string }[] = [
  { narrative: "\n\nA shadow detaches from the darkness — too late, you hear the scrape of steel. An ambush!", enemy: "Bandit Thug", cr: "CR1/2" },
  { narrative: "\n\nThe ground trembles as something large crashes through the underbrush. Red eyes fix on you from the gloom.", enemy: "Dire Wolf", cr: "CR1" },
  { narrative: "\n\nAn arrow whistles past your ear, embedding in the wall. Figures emerge from hiding, weapons drawn.", enemy: "Goblin Ambusher", cr: "CR1/4" },
  { narrative: "\n\nA low hiss echoes from the shadows. Scales rasp against stone as a creature slithers into view, fangs bared.", enemy: "Giant Poisonous Snake", cr: "CR1/4" },
];

/**
 * Check whether a combat injection is needed. If 5+ consecutive turns
 * have passed without a COMBAT_START and the current location is dangerous
 * (not in the safe list), returns an ambush scene + COMBAT_START tag to
 * append to the DM response. Otherwise returns null.
 */
export function checkCombatInjection(
  rawResponse: string,
  currentLocation: string,
): { appendNarrative: string; appendTag: string } | null {
  const hasCombat = /\[COMBAT_START\]/i.test(rawResponse);
  if (hasCombat) {
    _turnsWithoutCombat = 0;
    markCombatStarted();
    return null;
  }

  _turnsWithoutCombat++;

  if (_turnsWithoutCombat < 5) return null;

  const locLower = currentLocation.toLowerCase();

  // Don't inject in safe areas
  if (SAFE_LOCATIONS.some(safe => locLower.includes(safe))) return null;

  // Only inject in dangerous areas
  const isDangerous = DANGEROUS_LOCATIONS.some(d => locLower.includes(d));
  if (!isDangerous) return null;

  // Inject ambush
  _turnsWithoutCombat = 0;
  const ambush = AMBUSH_SCENES[Math.floor(Math.random() * AMBUSH_SCENES.length)];
  markCombatStarted();

  return {
    appendNarrative: ambush.narrative,
    appendTag: `\n[COMBAT_START] ${ambush.enemy} ${ambush.cr}`,
  };
}

/**
 * Track consecutive turns with the same location and log a warning
 * when it exceeds 3 turns — indicates the LLM is ignoring LOCATION updates.
 */
let _lastLocation: string | null = null;
let _sameLocationCount = 0;

/**
 * Detect item acquisition language in narrative and warn if backpack
 * did not change — indicates items mentioned in prose were not added
 * to inventory by the engine.
 */
const ITEM_ACQUISITION_PATTERNS = [
  /you\s+(?:find|found)\b/i,
  /you\s+(?:pocket|pocketed)\b/i,
  /you\s+(?:pick\s+up|picked\s+up)\b/i,
  /you\s+(?:receive|received)\b/i,
  /you\s+(?:grab|grabbed)\b/i,
  /you\s+(?:collect|collected)\b/i,
  /you\s+(?:take|took|taken)\b/i,
  /you\s+(?:loot|looted)\b/i,
  /among\s+the\s+items\b/i,
  /hands?\s+you\b/i,
  /gives?\s+you\b/i,
];

export function checkItemAcquisition(
  narrative: string,
  backpackBefore: string[],
  backpackAfter: string[],
): void {
  const mentionsAcquisition = ITEM_ACQUISITION_PATTERNS.some(p => p.test(narrative));
  if (mentionsAcquisition && backpackBefore.length === backpackAfter.length) {
    const same = backpackBefore.length === backpackAfter.length &&
      backpackBefore.every((item, i) => item === backpackAfter[i]);
    if (same) {
      console.warn(
        `[parse-response] ITEM ACQUISITION WARNING: Narrative mentions finding/receiving an item but backpack did not change`
      );
    }
  }
}

export function checkLocationStagnation(currentLocation: string): void {
  if (_lastLocation && currentLocation.toLowerCase() === _lastLocation.toLowerCase()) {
    _sameLocationCount++;
    if (_sameLocationCount > 3) {
      console.warn(
        `[parse-response] LOCATION STAGNATION: "${currentLocation}" has not changed for ${_sameLocationCount} consecutive turns`
      );
    }
  } else {
    _sameLocationCount = 1;
    _lastLocation = currentLocation;
  }
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
        sceneImagePrompt: typeof obj.sceneImagePrompt === "string" ? sanitizeScenePrompt(obj.sceneImagePrompt) : undefined,
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
 * Strip NPC descriptions, character names, dialogue, inventory references,
 * and living beings from scene image prompts. Keep only: location, environment,
 * architecture, lighting, time of day, weather, atmosphere, objects.
 */
function sanitizeScenePrompt(raw: string): string {
  let prompt = raw.trim();

  // Remove quoted dialogue
  prompt = prompt.replace(/"[^"]{2,}"/g, "");
  prompt = prompt.replace(/'[^']{2,}'/g, "");

  // Remove NPC/character name patterns: "a tall elf named Galadriel", "the merchant Boros", etc.
  prompt = prompt.replace(/\b(?:named|called)\s+[A-Z][a-z]+/gi, "");

  // Remove references to specific people/NPCs/characters by capitalized name
  // (but keep environment proper nouns like "Waterdeep" which are locations)
  prompt = prompt.replace(/\b(?:the\s+)?(?:old|young|tall|short|hooded|cloaked|armored|masked|wounded|mysterious)\s+(?:man|woman|figure|stranger|person|merchant|guard|soldier|knight|thief|priest|mage|wizard|sorcerer|bartender|innkeeper|barkeep|shopkeeper|vendor|blacksmith|beggar|noble|lord|lady|king|queen|prince|princess|peasant|villager|warrior|ranger|rogue|bard|cleric|druid|paladin|monk|barbarian|warlock|fighter)\b/gi, "");
  prompt = prompt.replace(/\b(?:a|an|the|some|several|many|few|two|three)\s+(?:men|women|figures|strangers|people|merchants|guards|soldiers|knights|thieves|priests|mages|wizards|sorcerers|bartenders|innkeepers|shopkeepers|vendors|blacksmiths|beggars|nobles|lords|ladies|peasants|villagers|warriors|rangers|rogues|bards|clerics|druids|paladins|monks|barbarians|warlocks|fighters|adventurers|travelers|travellers|crowds?|groups?|bands?|parties|patrons|townsfolk|citizens|dwarves|elves|halflings|gnomes|orcs|goblins|kobolds|humans|tieflings|dragonborn|half-orcs|half-elves)\b/gi, "");

  // Remove lone NPC/character role words
  prompt = prompt.replace(/\b(?:NPC|character|hero|heroine|protagonist|companion|ally|enemy|foe|villain|boss)\b/gi, "");

  // Remove D&D race words when referring to people (not locations)
  prompt = prompt.replace(/\b(?:a|an|the)\s+(?:human|elf|dwarf|halfling|gnome|half-elf|half-orc|tiefling|dragonborn|orc|goblin|kobold)\b/gi, "");

  // Remove clothing/equipment on people: "wearing leather armor", "carrying a sword"
  prompt = prompt.replace(/\b(?:wearing|wielding|carrying|holding|brandishing|clutching|gripping)\s+[^,.\n]{3,40}/gi, "");

  // Remove inventory item references: "a potion of healing", "a +1 longsword"
  prompt = prompt.replace(/\b(?:a\s+)?(?:\+\d\s+)?(?:potion|scroll|wand|staff|amulet|ring|cloak|helm|shield|sword|dagger|bow|axe|mace|hammer)\s+(?:of\s+)?[^,.\n]{0,30}/gi, "");

  // Remove dialogue tags
  prompt = prompt.replace(/\b(?:says?|said|speaks?|spoke|whispers?|whispered|shouts?|shouted|asks?|asked|replies?|replied|mutters?|muttered)\b[^,.\n]{0,40}/gi, "");

  // Collapse extra whitespace and commas
  prompt = prompt.replace(/,\s*,/g, ",");
  prompt = prompt.replace(/\s{2,}/g, " ");
  prompt = prompt.replace(/^[\s,]+|[\s,]+$/g, "");

  return prompt || raw.trim();
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
