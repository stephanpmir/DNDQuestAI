/**
 * Rules Reference Detector
 *
 * Detects when a player is asking a rules question (vs. taking an action)
 * and returns a concise D&D 5e rules reference card.
 *
 * STRICT POLICY: This detector must ONLY fire on explicit rules questions.
 * It must NEVER intercept player actions, short replies, or roleplay.
 */

/** Question-intent word prefixes that can start a rules question */
const QUESTION_STARTERS = [
  "how", "what", "why", "when", "can", "does", "do", "is", "are", "which",
];

/** Patterns that indicate a rules question (only checked AFTER the pre-check passes) */
const RULES_QUESTION_PATTERNS: [RegExp, string][] = [
  [/\bhow\s+does?\s+/i, "mechanic"],
  [/\bwhat\s+(?:is|are|does?)\s+/i, "definition"],
  [/\bwhat\s+happens?\s+when\b/i, "consequence"],
  [/\bcan\s+(?:I|my|a|an)\s+/i, "capability"],
  [/\bdoes?\s+\w+\s+stack\s+with\b/i, "stacking"],
  [/\bhow\s+many\b/i, "quantity"],
  [/\bwhat\s+are\s+the\s+rules?\s+for\b/i, "rules_for"],
  [/\bexplain\s+/i, "explanation"],
  [/\bhow\s+do(?:es)?\s+(?:I|you)\s+(?:calculate|compute|determine|figure)\b/i, "calculation"],
  [/\bwhat\s+(?:modifier|bonus|proficiency|DC|AC|HP|hit\s+dice|spell\s+slot)/i, "stat_query"],
  [/\bhow\s+(?:much|far|long|often)\b/i, "measurement"],
  [/\bis\s+(?:it|that|this)\s+(?:possible|allowed|legal)\b/i, "legality"],
];

/** D&D 5e rules reference topics — keyword → answer */
const RULES_DATABASE: Record<string, { title: string; text: string }> = {
  "advantage": {
    title: "Advantage & Disadvantage",
    text: "Roll 2d20. With advantage, use the higher roll. With disadvantage, use the lower. They don't stack — if you have both, they cancel out and you roll normally.",
  },
  "proficiency bonus": {
    title: "Proficiency Bonus",
    text: "Levels 1-4: +2. Levels 5-8: +3. Levels 9-12: +4. Levels 13-16: +5. Levels 17-20: +6. Added to attack rolls, saving throws, and skill checks you're proficient in.",
  },
  "death save": {
    title: "Death Saving Throws",
    text: "At 0 HP, roll d20 each turn. 10+ = success, 9- = failure. 3 successes = stabilized. 3 failures = dead. Natural 20 = regain 1 HP. Natural 1 = 2 failures.",
  },
  "critical hit": {
    title: "Critical Hits",
    text: "Natural 20 on an attack roll. Double all damage dice (not modifiers). For example, 1d8+3 becomes 2d8+3.",
  },
  "armor class": {
    title: "Armor Class (AC)",
    text: "Base AC = 10 + DEX modifier (no armor). Light armor: armor + DEX. Medium: armor + DEX (max +2). Heavy: armor value only. Shield adds +2.",
  },
  "spell slot": {
    title: "Spell Slots",
    text: "Spell slots are your magical fuel. Each spell level requires a slot of that level or higher. Slots refresh on a long rest (short rest for Warlocks). Cantrips cost no slots.",
  },
  "opportunity attack": {
    title: "Opportunity Attacks",
    text: "When a creature leaves your reach, you can use your reaction to make one melee attack. Uses your reaction for the round. Disengage action prevents opportunity attacks.",
  },
  "concentration": {
    title: "Concentration",
    text: "Some spells require concentration (up to their duration). Taking damage forces a CON save (DC = 10 or half damage taken, whichever is higher). Only one concentration spell at a time.",
  },
  "short rest": {
    title: "Short Rest",
    text: "At least 1 hour of downtime. You can spend Hit Dice to recover HP: roll the die + CON modifier per Hit Die spent. Some class features also recharge.",
  },
  "long rest": {
    title: "Long Rest",
    text: "At least 8 hours (6 sleeping, 2 light activity). Regain all HP, recover half your total Hit Dice (minimum 1), and refresh all spell slots and most abilities.",
  },
  "ability check": {
    title: "Ability Checks",
    text: "Roll d20 + ability modifier (+ proficiency bonus if proficient). Meet or exceed the DC to succeed. Easy DC 10, Medium DC 15, Hard DC 20, Very Hard DC 25.",
  },
  "saving throw": {
    title: "Saving Throws",
    text: "Roll d20 + ability modifier + proficiency bonus (if proficient in that save). Used to resist spells, traps, poisons, and other effects. Each class is proficient in 2 saves.",
  },
  "attack roll": {
    title: "Attack Rolls",
    text: "Roll d20 + ability modifier + proficiency bonus. Melee uses STR (or DEX for finesse weapons). Ranged uses DEX. Spell attacks use spellcasting ability. Must meet or exceed target's AC.",
  },
  "hit dice": {
    title: "Hit Dice",
    text: "You have one Hit Die per level (die size depends on class). Spend them during short rests to heal: roll + CON modifier per die. Recover half your total Hit Dice on a long rest.",
  },
  "initiative": {
    title: "Initiative",
    text: "Roll d20 + DEX modifier at the start of combat. Higher goes first. Ties broken by DEX score. Determines turn order for the entire combat encounter.",
  },
  "sneak attack": {
    title: "Sneak Attack (Rogue)",
    text: "Once per turn, deal extra damage with a finesse or ranged weapon when you have advantage, OR when an ally is within 5 feet of the target. Scales with Rogue level.",
  },
  "rage": {
    title: "Rage (Barbarian)",
    text: "Bonus action to enter rage. Gain advantage on STR checks/saves, bonus melee damage (+2 to +4), and resistance to bludgeoning/piercing/slashing. Lasts 1 minute or until you stop attacking.",
  },
  "wild shape": {
    title: "Wild Shape (Druid)",
    text: "Transform into a beast you've seen. Use the beast's physical stats but keep your mental stats. When beast HP drops to 0, you revert. Usable twice per short rest.",
  },
  "flanking": {
    title: "Flanking (Optional Rule)",
    text: "When two allies are on opposite sides of an enemy, both gain advantage on melee attack rolls against that enemy. This is an optional rule — check with your DM.",
  },
  "grapple": {
    title: "Grappling",
    text: "Use the Attack action to make a STR (Athletics) check vs target's STR (Athletics) or DEX (Acrobatics). Success: target's speed becomes 0. Target can use their action to escape with the same contested check.",
  },
};

/** Extract the D&D topic from a rules question */
function extractTopic(input: string): string | null {
  const lower = input.toLowerCase();

  // Direct keyword match against our database
  for (const key of Object.keys(RULES_DATABASE)) {
    if (lower.includes(key)) return key;
  }

  // Common aliases
  const aliases: Record<string, string> = {
    "ac": "armor class",
    "hp": "hit dice",
    "hit points": "hit dice",
    "crit": "critical hit",
    "crits": "critical hit",
    "nat 20": "critical hit",
    "natural 20": "critical hit",
    "spell slots": "spell slot",
    "death saves": "death save",
    "death saving throw": "death save",
    "dying": "death save",
    "prof bonus": "proficiency bonus",
    "proficiency": "proficiency bonus",
    "resting": "short rest",
    "opportunity attacks": "opportunity attack",
    "aoo": "opportunity attack",
    "attacks of opportunity": "opportunity attack",
    "ability checks": "ability check",
    "skill check": "ability check",
    "saving throws": "saving throw",
    "saves": "saving throw",
    "attack rolls": "attack roll",
    "to hit": "attack roll",
    "stealth": "sneak attack",
  };

  for (const [alias, topic] of Object.entries(aliases)) {
    if (lower.includes(alias)) return topic;
  }

  return null;
}

export interface RulesReferenceResult {
  title: string;
  text: string;
  topic: string;
}

/**
 * Detect if the player is asking a D&D rules question.
 *
 * Returns a rules reference result if the input is a genuine rules question,
 * or null if the input is a player action/roleplay/conversation.
 *
 * STRICT PRE-CHECK:
 * - If the message has no question mark AND does not start with a question word,
 *   return null immediately without evaluating further.
 * - Messages under 6 words without a question mark are never rules questions.
 * - Action verbs ("attack", "I run", "I search") are never rules questions.
 */
export function detectRulesQuestion(input: string): RulesReferenceResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ── STRICT PRE-CHECK ──────────────────────────────────────────────
  const hasQuestionMark = trimmed.includes("?");
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  const startsWithQuestionWord = QUESTION_STARTERS.includes(firstWord);

  // Gate: must have question mark OR start with a question word
  if (!hasQuestionMark && !startsWithQuestionWord) {
    return null;
  }

  // Gate: short messages (under 6 words) without a question mark are never rules questions
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 6 && !hasQuestionMark) {
    return null;
  }

  // Gate: reject action verbs — these are always gameplay, not rules questions
  const ACTION_VERB_PATTERN = /^(?:I\s+)?(?:attack|strike|hit|fight|run|search|look|go|move|walk|enter|draw|grab|pick up|take|steal|sneak|hide|climb|swim|jump|cast|use|drink|eat|equip|talk|speak|say|ask|tell|shout|open|close|rest|sleep|camp|buy|sell|trade)\b/i;
  if (ACTION_VERB_PATTERN.test(trimmed)) {
    return null;
  }

  // Gate: reject short conversational replies
  const CONVERSATIONAL_PATTERN = /^(?:yes|no|sure|ok|okay|thanks|thank you|interesting|tell me more|go on|continue|understood|got it|alright|fine|right|indeed|hm+|uh+|oh+)\b/i;
  if (CONVERSATIONAL_PATTERN.test(trimmed)) {
    return null;
  }

  // ── QUESTION PATTERN MATCHING ─────────────────────────────────────
  let matchedCategory: string | null = null;
  for (const [pattern, category] of RULES_QUESTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      matchedCategory = category;
      break;
    }
  }

  // Must match a question pattern to proceed
  if (!matchedCategory) {
    return null;
  }

  // ── TOPIC EXTRACTION ──────────────────────────────────────────────
  const topic = extractTopic(trimmed);
  if (!topic) {
    return null; // No matching topic — let the DM handle it narratively
  }

  const entry = RULES_DATABASE[topic];
  if (!entry) {
    return null;
  }

  return {
    title: entry.title,
    text: entry.text,
    topic,
  };
}
