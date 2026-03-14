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

/** Parsed state values extracted from DM response tags. */
export interface ParsedGameState {
  hp?: number;
  xp?: number;
  gold?: number;
  location?: string;
  backpack?: string[];
  worn?: string[];
  combatStart?: string;
}

export interface ParsedDMResponse {
  narrative: string;
  sceneImagePrompt?: string;
  checkRequired?: CheckRequired;
  parsedState: ParsedGameState;
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

  // Extract state values from parsed tags
  const parsedState: ParsedGameState = {};

  const hpRaw = fields.get("HP");
  if (hpRaw) {
    const hpVal = parseInt(hpRaw.replace(/[^-\d]/g, ""), 10);
    if (!isNaN(hpVal)) parsedState.hp = hpVal;
  }

  const xpRaw = fields.get("XP");
  if (xpRaw) {
    const xpVal = parseInt(xpRaw.replace(/[^-\d]/g, ""), 10);
    if (!isNaN(xpVal)) parsedState.xp = xpVal;
  }

  const goldRaw = fields.get("GOLD");
  if (goldRaw) {
    const goldVal = parseInt(goldRaw.replace(/[^-\d]/g, ""), 10);
    if (!isNaN(goldVal)) parsedState.gold = goldVal;
  }

  const locationRaw = fields.get("LOCATION");
  if (locationRaw) parsedState.location = locationRaw.trim();

  const backpackRaw = fields.get("BACKPACK");
  if (backpackRaw) {
    parsedState.backpack = backpackRaw.split("|").map(s => s.trim()).filter(Boolean);
  }

  const wornRaw = fields.get("WORN");
  if (wornRaw) {
    parsedState.worn = wornRaw.split("|").map(s => s.trim()).filter(Boolean);
  }

  const combatRaw = fields.get("COMBAT_START");
  if (combatRaw) parsedState.combatStart = combatRaw.trim();

  // Clean narrative
  narrative = cleanNarrative(narrative);

  return { narrative, sceneImagePrompt, checkRequired, parsedState };
}

// ── Combat state tracking ─────────────────────────────────────────
let _combatActive = false;

export function markCombatStarted(): void { _combatActive = true; }
export function markCombatEnded(): void { _combatActive = false; }
export function isCombatActive(): boolean { return _combatActive; }

// ── State freeze tracking (Fix 1) ────────────────────────────────
const _frozenCounters: Record<string, { value: unknown; count: number }> = {
  hp: { value: null, count: 0 },
  xp: { value: null, count: 0 },
  gold: { value: null, count: 0 },
  location: { value: null, count: 0 },
};

function trackFrozenField(field: string, currentValue: unknown): void {
  const tracker = _frozenCounters[field];
  if (!tracker) return;
  if (tracker.value === currentValue) {
    tracker.count++;
    if (tracker.count >= 3) {
      console.warn(`[parse-response] State frozen warning — ${field} unchanged for ${tracker.count}+ turns`);
    }
  } else {
    tracker.value = currentValue;
    tracker.count = 1;
  }
}

// ── Combat injection (Fix 3) ─────────────────────────────────────
let _turnsWithoutCombat = 0;

const DANGEROUS_INJECTION_LOCATIONS = ["bazaar", "forest", "docks", "alley", "warehouse", "dungeon", "ruins", "outskirts"];

const CR_QUARTER_ENEMIES = ["Thug", "Bandit", "Giant Rat"];

const AMBUSH_NARRATIVES = [
  "A shadow detaches from the darkness — too late, you hear the scrape of steel. An ambush!",
  "Something stirs in the gloom ahead. Before you can react, a shape lunges from cover with bared teeth.",
];

// ── enforceGameState: single function for all 4 fixes ────────────

export interface GameStateForEnforcement {
  hp: number;
  maxHp: number;
  xp: number;
  gold: number;
  location: string;
  inventory: string[];
}

export interface EnforcedResult {
  hp: number;
  xp: number;
  gold: number;
  location: string;
  inventory: string[];
  narrative: string;
  warnings: string[];
}

/**
 * Central enforcement function — applies all parser-level fixes:
 *   Fix 1: Apply parsed state tags; warn if any field frozen 3+ turns
 *   Fix 2: Validate gold spend / item removal against actual state
 *   Fix 3: Combat injection after 5 safe turns in dangerous areas
 *   Fix 4: XP by DC + 40% gold on successful DC 12+ checks
 */
export function enforceGameState(
  parsed: ParsedDMResponse,
  current: GameStateForEnforcement,
  engineOutcome: {
    hpChange?: number;
    goldChange?: number;
    xpGained?: number;
    locationChange?: string;
    itemsGained: string[];
    itemsLost: string[];
    roll?: { success: boolean; dc?: number };
  },
  rawResponse: string,
): EnforcedResult {
  const warnings: string[] = [];
  let narrative = parsed.narrative;

  // ── Fix 1: Apply parsed state unconditionally ──────────────────
  // Start from current, apply engine outcome, then override with parsed tags

  // HP: engine outcome first
  let hp = current.hp;
  if (engineOutcome.hpChange) {
    const candidateHp = Math.max(0, Math.min(current.maxHp, hp + engineOutcome.hpChange));
    // HP guard: only allow decrease if combat is active
    if (candidateHp < hp) {
      const hasCombatTag = /\[COMBAT_START\]/i.test(rawResponse);
      const hasDamageTag = /\[DAMAGE\]/i.test(rawResponse);
      if (_combatActive || hasCombatTag || hasDamageTag) {
        if (hasCombatTag) markCombatStarted();
        hp = candidateHp;
      } else {
        warnings.push("HP change blocked — no combat active");
      }
    } else {
      hp = candidateHp;
    }
  }
  // Override with parsed [HP] tag if present (treat as absolute value)
  if (parsed.parsedState.hp !== undefined) {
    const parsedHp = Math.max(0, Math.min(current.maxHp, parsed.parsedState.hp));
    // Same HP guard for tag-driven decreases
    if (parsedHp < hp) {
      if (_combatActive || parsed.parsedState.combatStart) {
        hp = parsedHp;
      } else {
        warnings.push("HP change blocked — no combat active");
      }
    } else {
      hp = parsedHp;
    }
  }

  // XP
  let xp = current.xp;
  if (engineOutcome.xpGained) xp += engineOutcome.xpGained;
  if (parsed.parsedState.xp !== undefined) xp = Math.max(xp, parsed.parsedState.xp);

  // Gold
  let gold = current.gold;
  if (engineOutcome.goldChange) gold += engineOutcome.goldChange;
  if (parsed.parsedState.gold !== undefined) gold = parsed.parsedState.gold;

  // Location
  let location = current.location;
  if (engineOutcome.locationChange) location = engineOutcome.locationChange;
  if (parsed.parsedState.location) location = parsed.parsedState.location;

  // DEBUG: movement word detection for location extraction
  const MOVEMENT_WORDS = /\b(?:entered|arrived|reached|emerged|stepped\s+into|made\s+your\s+way\s+to|found\s+yourself\s+in|walked\s+to|headed\s+toward)\b/i;
  const movementFound = MOVEMENT_WORDS.test(narrative);
  let extractedLocation: string | null = null;
  if (movementFound && location === current.location) {
    // Try extracting from last 1-2 sentences
    const sentences = narrative.replace(/\n/g, " ").split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const lastSentences = sentences.slice(-2).join(" ");
    const locMatch = lastSentences.match(/(?:entered|arrived\s+at|reached|emerged\s+into|stepped\s+into|found\s+yourself\s+in|walked\s+to|headed\s+toward|made\s+your\s+way\s+to)\s+(?:the\s+)?(.{3,60}?)(?:\.|,|!|\?|$)/i);
    extractedLocation = locMatch?.[1]?.trim() ?? null;
  }
  console.log(`Location check: movement word found=${movementFound} current=${location} extracted=${extractedLocation ?? "none"}`);

  // Inventory
  const inventory = [...current.inventory];
  if (engineOutcome.itemsGained.length > 0) inventory.push(...engineOutcome.itemsGained);

  // ── Fix 2: Validate gold spend and item removal ────────────────
  if (engineOutcome.itemsLost.length > 0) {
    for (const item of engineOutcome.itemsLost) {
      const idx = inventory.indexOf(item);
      if (idx !== -1) {
        inventory.splice(idx, 1);
      } else {
        warnings.push(`Inventory validation override — player spent fictional ${item}`);
      }
    }
  }
  // Validate gold — never let it go negative from a spend
  if (gold < 0) {
    const overspend = Math.abs(gold);
    warnings.push(`Inventory validation override — player spent fictional ${overspend} gold`);
    gold = 0;
  }

  // Override with parsed [BACKPACK] tag if present
  if (parsed.parsedState.backpack && parsed.parsedState.backpack.length > 0) {
    // Validate: parsed backpack cannot add items the engine didn't grant
    // but we accept it as the new state to fix LLM-described loot
  }

  // Track frozen fields (Fix 1 warnings)
  trackFrozenField("hp", hp);
  trackFrozenField("xp", xp);
  trackFrozenField("gold", gold);
  trackFrozenField("location", location);

  // ── Fix 3: Combat injection after 5 safe turns ─────────────────
  if (parsed.parsedState.combatStart) {
    _turnsWithoutCombat = 0;
    markCombatStarted();
  } else {
    _turnsWithoutCombat++;
  }

  // DEBUG: log combat check every turn
  const locLower = location.toLowerCase();
  const isDangerous = DANGEROUS_INJECTION_LOCATIONS.some(d => locLower.includes(d));
  console.log(`Combat check: turns=${_turnsWithoutCombat} location=${location} dangerous=${isDangerous}`);

  if (!parsed.parsedState.combatStart && _turnsWithoutCombat >= 5 && isDangerous) {
    _turnsWithoutCombat = 0;
    const enemy = CR_QUARTER_ENEMIES[Math.floor(Math.random() * CR_QUARTER_ENEMIES.length)];
    const ambushText = AMBUSH_NARRATIVES[Math.floor(Math.random() * AMBUSH_NARRATIVES.length)];
    narrative = narrative + `\n\n${ambushText}\n[COMBAT_START] ${enemy} CR1/4`;
    markCombatStarted();
  }

  // Detect combat end
  if (/\b(?:defeated|slain|killed|fled|escaped|retreated)\b/i.test(narrative) && !parsed.parsedState.combatStart) {
    markCombatEnded();
  }

  // ── Fix 4: XP and loot on successful checks ───────────────────
  const rollDc = engineOutcome.roll?.dc ?? 0;
  if (engineOutcome.roll?.success && rollDc >= 12) {
    const dc = rollDc;
    // XP by DC difficulty
    let xpReward: number;
    if (dc <= 10) xpReward = 1;
    else if (dc <= 15) xpReward = 2;
    else xpReward = 3;
    xp += xpReward;

    // 40% chance for 5-15 gold
    if (Math.random() < 0.4) {
      gold += Math.floor(Math.random() * 11) + 5;
    }
  }

  return { hp, xp, gold, location, inventory, narrative, warnings };
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
        parsedState: {},
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
