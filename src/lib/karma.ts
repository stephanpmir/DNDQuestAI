/**
 * Karma & Alignment System
 *
 * Inspired by: Fallout karma, KOTOR light/dark, Fable morality,
 * BG3 companion approval, Dishonored chaos, D&D alignment shifts,
 * Pendragon virtue/vice traits.
 *
 * Scale: -100 (absolute evil) to +100 (absolute good), starting at 0 (neutral).
 *
 * The system tracks both a numeric karma score AND a categorical alignment,
 * and determines divine favor/disfavor, NPC reactions, shop prices,
 * item affinity, and narrative tone.
 */

// ── Alignment Types ────────────────────────────────────────────

export const ALIGNMENTS = [
  "saintly",     // 76 to 100
  "virtuous",    // 51 to 75
  "good",        // 26 to 50
  "neutral",     // -25 to 25
  "selfish",     // -26 to -50
  "malevolent",  // -51 to -75
  "diabolical",  // -76 to -100
] as const;

export type Alignment = (typeof ALIGNMENTS)[number];

export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  saintly: "Saintly",
  virtuous: "Virtuous",
  good: "Good",
  neutral: "Neutral",
  selfish: "Selfish",
  malevolent: "Malevolent",
  diabolical: "Diabolical",
};

// ── Karma Event Types ──────────────────────────────────────────

/** Actions that shift karma — detected from player input or engine outcomes */
export interface KarmaEvent {
  type: KarmaActionType;
  amount: number;
  description: string;
  turn: number;
}

export type KarmaActionType =
  // Good actions
  | "help_npc"
  | "spare_enemy"
  | "donate_gold"
  | "heal_ally"
  | "protect_innocent"
  | "honest_dialogue"
  | "self_sacrifice"
  | "free_prisoner"
  // Evil actions
  | "kill_innocent"
  | "steal"
  | "lie_cheat"
  | "betray_ally"
  | "desecrate"
  | "intimidate_weak"
  | "poison"
  | "loot_corpse"
  // Neutral
  | "pragmatic_choice";

/** Karma change amounts for different action types */
export const KARMA_VALUES: Record<KarmaActionType, number> = {
  // Good (+)
  help_npc: 5,
  spare_enemy: 8,
  donate_gold: 3,
  heal_ally: 4,
  protect_innocent: 10,
  honest_dialogue: 2,
  self_sacrifice: 15,
  free_prisoner: 10,
  // Evil (-)
  kill_innocent: -15,
  steal: -8,
  lie_cheat: -3,
  betray_ally: -12,
  desecrate: -10,
  intimidate_weak: -5,
  poison: -8,
  loot_corpse: -2,
  // Neutral
  pragmatic_choice: 0,
};

// ── Karma Detection ────────────────────────────────────────────

/** Patterns to detect karma-relevant actions from player input */
const GOOD_ACTION_PATTERNS: [RegExp, KarmaActionType][] = [
  [/\b(help|aid|assist|save|rescue|protect|defend)\b.*\b(villager|npc|innocent|child|elder|woman|man|people|citizen|merchant|farmer|peasant)\b/i, "help_npc"],
  [/\b(spare|mercy|let.*go|release|forgive|show mercy)\b/i, "spare_enemy"],
  [/\b(donate|give gold|offer gold|give coin|charity|tithe)\b/i, "donate_gold"],
  [/\b(heal|tend.*wounds|bandage|cure|mend)\b.*\b(companion|ally|friend|partner|npc)\b/i, "heal_ally"],
  [/\b(protect|shield|guard|stand between|block.*from)\b.*\b(innocent|child|villager|people|helpless)\b/i, "protect_innocent"],
  [/\b(tell.*truth|be honest|confess|admit|speak truthfully)\b/i, "honest_dialogue"],
  [/\b(sacrifice|give.*life|take.*hit for|absorb.*blow|volunteer)\b/i, "self_sacrifice"],
  [/\b(free|release|unlock|liberate|unchain|unshackle)\b.*\b(prisoner|captive|slave|hostage)\b/i, "free_prisoner"],
];

const EVIL_ACTION_PATTERNS: [RegExp, KarmaActionType][] = [
  [/\b(kill|murder|slay|execute|slaughter)\b.*\b(merchant|villager|innocent|child|civilian|farmer|beggar|unarmed|sleeping|helpless|shopkeeper|innkeeper)\b/i, "kill_innocent"],
  [/\b(steal|pickpocket|rob|burgle|shoplift|take.*without|swipe|pilfer)\b/i, "steal"],
  [/\b(lie|deceive|con|swindle|cheat|trick|mislead|betray trust)\b/i, "lie_cheat"],
  [/\b(betray|backstab|double.?cross|turn against|abandon)\b.*\b(ally|companion|friend|partner)\b/i, "betray_ally"],
  [/\b(desecrate|defile|vandalize|destroy.*shrine|burn.*temple|profane|corrupt)\b/i, "desecrate"],
  [/\b(threaten|intimidate|bully|extort|shake down)\b.*\b(merchant|villager|child|beggar|innocent|weak|unarmed|shopkeeper)\b/i, "intimidate_weak"],
  [/\b(poison|taint|contaminate)\b.*\b(well|food|drink|water|supply)\b/i, "poison"],
  [/\b(loot|strip|rob)\b.*\b(corpse|body|dead|fallen)\b/i, "loot_corpse"],
];

/** Detect karma-relevant actions from player input */
export function detectKarmaAction(
  playerInput: string
): { type: KarmaActionType; amount: number } | null {
  // Check good patterns first
  for (const [pattern, type] of GOOD_ACTION_PATTERNS) {
    if (pattern.test(playerInput)) {
      return { type, amount: KARMA_VALUES[type] };
    }
  }

  // Check evil patterns
  for (const [pattern, type] of EVIL_ACTION_PATTERNS) {
    if (pattern.test(playerInput)) {
      return { type, amount: KARMA_VALUES[type] };
    }
  }

  return null;
}

// ── Karma Calculations ─────────────────────────────────────────

/** Get alignment category from karma score */
export function getAlignment(karma: number): Alignment {
  if (karma >= 76) return "saintly";
  if (karma >= 51) return "virtuous";
  if (karma >= 26) return "good";
  if (karma >= -25) return "neutral";
  if (karma >= -50) return "selfish";
  if (karma >= -75) return "malevolent";
  return "diabolical";
}

/** Shop price modifier based on karma. Good = discounts, evil = markups */
export function shopPriceModifier(karma: number): number {
  if (karma >= 76) return 0.75;  // 25% discount (saintly)
  if (karma >= 51) return 0.85;  // 15% discount
  if (karma >= 26) return 0.90;  // 10% discount
  if (karma >= -25) return 1.0;  // Normal
  if (karma >= -50) return 1.15; // 15% markup
  if (karma >= -75) return 1.30; // 30% markup
  return 1.50;                   // 50% markup (diabolical)
}

/** NPC trust modifier: how willing NPCs are to help */
export function npcTrustModifier(karma: number): "trusted" | "normal" | "suspicious" | "feared" {
  if (karma >= 51) return "trusted";
  if (karma >= -25) return "normal";
  if (karma >= -50) return "suspicious";
  return "feared";
}

/** Divine favor — good gods help good players, evil god helps evil players */
export interface DivineEffect {
  source: "good_god" | "evil_god" | "none";
  type: "blessing" | "punishment" | "temptation" | "none";
  description: string;
  /** Mechanical effect on the next action */
  rollModifier: number;
}

/**
 * Determine if divine intervention occurs.
 * Called each turn with a small random chance.
 *
 * Good players: Good god blesses (+2 to rolls), evil god ignores.
 * Evil players: Evil god tempts with power (+2 to attack but -2 to social),
 *   good god may punish (-2 to rolls).
 * Neutral: No divine attention.
 */
export function checkDivineIntervention(karma: number, turnCount: number): DivineEffect | null {
  // Only check every few turns, with increasing chance at extreme karma
  const absKarma = Math.abs(karma);
  const chance = absKarma > 50 ? 0.08 : absKarma > 25 ? 0.04 : 0.01;

  if (Math.random() > chance) return null;

  if (karma >= 51) {
    // Good player: Good god helps
    return {
      source: "good_god",
      type: "blessing",
      description: "A warm light suffuses you — the gods of order smile upon your deeds.",
      rollModifier: 2,
    };
  }

  if (karma <= -51) {
    // Evil player: Evil god tempts, good god may punish
    const roll = Math.random();
    if (roll < 0.6) {
      // Evil god helps with power
      return {
        source: "evil_god",
        type: "temptation",
        description: "Dark whispers promise greater power. A shadowy energy courses through your veins.",
        rollModifier: 2, // Bonus to attacks, but narration should reflect the cost
      };
    } else {
      // Good god punishes
      return {
        source: "good_god",
        type: "punishment",
        description: "A cold chill passes through you — the gods of light have taken notice of your sins.",
        rollModifier: -2,
      };
    }
  }

  return null;
}

// ── Item Affinity ──────────────────────────────────────────────

/**
 * Item affinity based on alignment.
 * Good players find more magical/utility items and gold.
 * Evil players find more raw power weapons but face harder campaigns.
 */
export interface ItemAffinity {
  /** Bonus to finding magical items (perception/search checks) */
  magicalItemBonus: number;
  /** Bonus to gold found */
  goldMultiplier: number;
  /** Bonus to weapon damage */
  powerBonus: number;
  /** Difficulty modifier (higher = harder encounters) */
  difficultyModifier: number;
}

export function getItemAffinity(karma: number): ItemAffinity {
  if (karma >= 51) {
    // Good: More magical items, more gold, stable progression
    return { magicalItemBonus: 2, goldMultiplier: 1.25, powerBonus: 0, difficultyModifier: 0 };
  }
  if (karma >= 26) {
    return { magicalItemBonus: 1, goldMultiplier: 1.10, powerBonus: 0, difficultyModifier: 0 };
  }
  if (karma >= -25) {
    // Neutral: balanced
    return { magicalItemBonus: 0, goldMultiplier: 1.0, powerBonus: 0, difficultyModifier: 0 };
  }
  if (karma >= -50) {
    // Selfish: slight power bonus, harder campaign
    return { magicalItemBonus: -1, goldMultiplier: 0.9, powerBonus: 1, difficultyModifier: 1 };
  }
  // Evil: Raw power but very hard campaign, less gold
  return { magicalItemBonus: -2, goldMultiplier: 0.75, powerBonus: 2, difficultyModifier: 2 };
}

// ── Karma Consequences for the DM Prompt ───────────────────────

/** Generate the karma context string for the DM system prompt */
export function buildKarmaContext(karma: number, history: KarmaEvent[]): string {
  const alignment = getAlignment(karma);
  const trust = npcTrustModifier(karma);
  const recentEvents = history.slice(-5);

  const lines: string[] = [
    `## Karma & Alignment`,
    `- Karma Score: ${karma} (${ALIGNMENT_LABELS[alignment]})`,
    `- NPC Disposition: NPCs are ${trust} of this character`,
  ];

  if (karma >= 51) {
    lines.push("- Good-aligned NPCs offer help freely. Temples provide blessings. Merchants give discounts.");
    lines.push("- The character's reputation precedes them — people know of their good deeds.");
  } else if (karma >= 26) {
    lines.push("- NPCs are generally friendly and willing to help.");
  } else if (karma <= -51) {
    lines.push("- NPCs are fearful or hostile. Guards watch closely. Some merchants refuse service.");
    lines.push("- Dark-aligned NPCs may approach with sinister offers.");
    lines.push("- The character's reputation precedes them — people know of their crimes.");
    lines.push("- Bounty hunters or paladins may be hunting them.");
  } else if (karma <= -25) {
    lines.push("- NPCs are wary. Some refuse to deal with the character.");
  }

  if (recentEvents.length > 0) {
    lines.push("- Recent moral actions:");
    for (const e of recentEvents) {
      lines.push(`  - ${e.description} (${e.amount > 0 ? "+" : ""}${e.amount} karma)`);
    }
  }

  return lines.join("\n");
}
