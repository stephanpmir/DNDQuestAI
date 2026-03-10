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

// ── Fame Event Types ─────────────────────────────────────────────

export interface FameEvent {
  amount: number;
  reason: string;
  category: "quest" | "combat" | "crime" | "social" | "decay";
  turn: number;
}

/** Fame change amounts for different crime types */
export const CRIME_FAME_PENALTY: Record<string, number> = {
  theft: -2,
  assault: -5,
  murder: -10,
  trespass: -1,
  vandalism: -2,
};

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

/**
 * NPC fame-based disposition check.
 *
 * When a new NPC is introduced, they "roll" against the player's fame
 * to see if they've heard of the player. If they recognize the player,
 * karma determines whether that recognition is positive or negative.
 *
 * Fame check: d20 vs DC (20 - fame/5). Higher fame = easier to recognize.
 *   - Fame 0:   DC 20 (virtually impossible to recognize)
 *   - Fame 25:  DC 15
 *   - Fame 50:  DC 10
 *   - Fame 75:  DC 5
 *   - Fame 100: DC 0 (everyone knows you)
 *
 * If recognized:
 *   - Karma > 25:  friendly (they've heard good things)
 *   - Karma -25–25: cautious (they've heard rumors, unsure)
 *   - Karma < -25:  hostile (they've heard bad things / fear you)
 *
 * If not recognized: neutral (no opinion, treat normally)
 */
export type NpcDisposition = "friendly" | "neutral" | "cautious" | "hostile";

export function computeNpcDisposition(fame: number, karma: number): {
  disposition: NpcDisposition;
  recognized: boolean;
  fameRoll: number;
  fameDC: number;
} {
  const fameDC = Math.max(0, 20 - Math.floor(fame / 5));
  const fameRoll = Math.floor(Math.random() * 20) + 1;
  const recognized = fameRoll >= fameDC;

  if (!recognized) {
    return { disposition: "neutral", recognized: false, fameRoll, fameDC };
  }

  // They've heard of you — karma determines their attitude
  let disposition: NpcDisposition;
  if (karma > 25) {
    disposition = "friendly";
  } else if (karma < -25) {
    disposition = "hostile";
  } else {
    disposition = "cautious";
  }

  return { disposition, recognized: true, fameRoll, fameDC };
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

// ── Karma Drift & Diminishing Returns ─────────────────────────

/**
 * Apply diminishing returns to karma gain.
 * The further you are toward an extreme, the less same-direction actions move you.
 * Opposing-direction actions are amplified (easier to come back from extremes).
 * Inspired by KOTOR's light/dark point scaling.
 */
export function applyKarmaDiminishing(baseAmount: number, currentKarma: number): number {
  const sameDirection = Math.sign(baseAmount) === Math.sign(currentKarma);
  const ratio = Math.abs(currentKarma) / 100;

  if (sameDirection) {
    // Same direction: diminishing — at karma ±100, gain only 20% of base
    const factor = Math.max(0.2, 1 - ratio * 0.8);
    return Math.round(baseAmount * factor);
  }
  // Opposing direction: amplified — at karma ±100, gain 150% of base
  const factor = 1 + ratio * 0.5;
  return Math.round(baseAmount * factor);
}

/**
 * Karma drift toward neutral on rest.
 * Stronger at extremes: karma * 0.95 (lose 5% of current value, minimum ±1).
 * At karma ±10 or less, no drift (stable neutral zone).
 */
export function karmaRestDrift(currentKarma: number): number {
  if (Math.abs(currentKarma) <= 10) return 0;
  const drift = Math.sign(currentKarma) * -Math.max(1, Math.floor(Math.abs(currentKarma) * 0.05));
  return drift;
}

/**
 * Fame decay on rest. Lose 1 fame per rest if above 10.
 * Fame cannot drop below a floor based on highest tier ever reached.
 * Inspired by Ghostfire Gaming's monthly decay.
 */
export function fameRestDecay(currentFame: number): number {
  if (currentFame <= 10) return 0;
  return -1;
}

/**
 * Scale combat fame by level gap.
 * No fame for trivially easy fights (5+ levels below player).
 * Diminishing returns at high fame (harder to gain when already famous).
 * Inspired by D&D XP scaling and Demon's Souls tendency.
 */
export function scaledCombatFame(playerLevel: number, currentFame: number): number {
  // Base fame from combat: 1 at low fame, scales down as fame grows
  const fameDiminish = 1 / Math.log2(currentFame + 2);
  const base = Math.max(0, Math.round(1 * fameDiminish));
  // Since we don't track enemy CR individually, use player level as proxy:
  // at high levels, basic encounters give less fame
  if (playerLevel >= 10 && base <= 0) return 0;
  return Math.max(0, base);
}

// ── Encounter Modifiers (Karma-Based) ─────────────────────────

export interface KarmaEncounterModifiers {
  /** Chance of bounty hunter encounter per rest (0-0.15) */
  bountyHunterChance: number;
  /** Who is hunting: paladins hunt evil, thieves hunt good */
  bountyFaction: string;
  /** How civilians react: helpful, neutral, fearful, hostile */
  civilianBehavior: "helpful" | "neutral" | "fearful" | "hostile";
  /** How authorities react */
  authorityBehavior: "allied" | "neutral" | "suspicious" | "hostile";
}

export function getEncounterModifiers(karma: number): KarmaEncounterModifiers {
  const ratio = karma / 100;
  const absRatio = Math.abs(ratio);

  return {
    bountyHunterChance: absRatio > 0.5 ? (absRatio - 0.5) * 0.3 : 0,
    bountyFaction: karma < 0 ? "Order of the Silver Shield" : "Shadow Guild",
    civilianBehavior:
      ratio > 0.6 ? "helpful" :
      ratio > -0.3 ? "neutral" :
      ratio > -0.7 ? "fearful" :
      "hostile",
    authorityBehavior:
      ratio > 0.5 ? "allied" :
      ratio > -0.2 ? "neutral" :
      ratio > -0.6 ? "suspicious" :
      "hostile",
  };
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
export function buildKarmaContext(karma: number, history: KarmaEvent[], fame?: number): string {
  const alignment = getAlignment(karma);
  const trust = npcTrustModifier(karma);
  const recentEvents = history.slice(-5);
  const mods = getEncounterModifiers(karma);

  const lines: string[] = [
    `## Karma & Alignment`,
    `- Karma Score: ${karma} (${ALIGNMENT_LABELS[alignment]})`,
    `- NPC Disposition: NPCs are ${trust} of this character`,
    `- Civilians are ${mods.civilianBehavior} toward the player`,
    `- Authorities are ${mods.authorityBehavior} toward the player`,
  ];

  if (fame !== undefined) {
    const fameTier = fame >= 75 ? "Legendary" : fame >= 50 ? "Renowned" : fame >= 30 ? "Well-Known" : fame >= 15 ? "Recognized" : "Unknown";
    lines.push(`- Fame: ${fame} (${fameTier})`);
    if (fame >= 50) {
      lines.push("- The player is widely recognized. NPCs may reference their deeds (good or bad).");
    } else if (fame >= 15) {
      lines.push("- Some NPCs may have heard of the player.");
    }
  }

  if (karma >= 51) {
    lines.push("- Good-aligned NPCs offer help freely. Temples provide blessings. Merchants give discounts.");
    lines.push("- The character's reputation precedes them — people know of their good deeds.");
  } else if (karma >= 26) {
    lines.push("- NPCs are generally friendly and willing to help.");
  } else if (karma <= -51) {
    lines.push("- NPCs are fearful or hostile. Guards watch closely. Some merchants refuse service.");
    lines.push("- Dark-aligned NPCs may approach with sinister offers.");
    lines.push("- The character's reputation precedes them — people know of their crimes.");
    if (mods.bountyHunterChance > 0) {
      lines.push(`- The ${mods.bountyFaction} may be hunting them. Bounty hunters could appear.`);
    }
  } else if (karma <= -25) {
    lines.push("- NPCs are wary. Some refuse to deal with the character.");
  }

  // High positive karma can also attract enemies (thieves guild)
  if (karma >= 51 && mods.bountyHunterChance > 0) {
    lines.push(`- The ${mods.bountyFaction} views the player's heroism as a threat to their operations.`);
  }

  if (recentEvents.length > 0) {
    lines.push("- Recent moral actions:");
    for (const e of recentEvents) {
      lines.push(`  - ${e.description} (${e.amount > 0 ? "+" : ""}${e.amount} karma)`);
    }
  }

  return lines.join("\n");
}
