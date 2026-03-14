/**
 * Progression Engine — context-aware danger assessment and smart escalation.
 *
 * Replaces all hardcoded combat-forcing logic with a system that considers:
 *   - Campaign type (dungeon_crawl fights more than mystery)
 *   - Current location danger level
 *   - Narrative context (recent actions, failed checks)
 *   - Turn pacing (time since last combat or meaningful event)
 *   - Player level and current HP
 *
 * Exports a single function `getNextEscalation()` that the parser calls
 * each turn to decide whether to inject a combat encounter, a non-combat
 * threat, or nothing at all.
 */

import type { CampaignTheme } from "@/lib/campaigns";
import { pickEncounterMonster } from "@/lib/combat-engine";
import type { Monster } from "@/lib/monsters";
import { getMonsterByName } from "@/lib/monsters";

// ── Campaign type detection ───────────────────────────────────────

/** Broader campaign type buckets for escalation logic */
export type CampaignType =
  | "combat_heavy"    // dungeon_crawl, war_military, underdark, dragon_focused
  | "balanced"        // wilderness_hex, survival, seafaring, norse_viking, epic_worldsaving, undead_necromancy
  | "narrative_heavy" // urban_intrigue, horror, political, mystery, heist, fey_nature, gothic, desert_arabian, oriental, planar
  ;

const COMBAT_HEAVY_THEMES: CampaignTheme[] = [
  "dungeon_crawl", "war_military", "underdark", "dragon_focused",
];

const BALANCED_THEMES: CampaignTheme[] = [
  "wilderness_hex", "survival", "seafaring", "norse_viking",
  "epic_worldsaving", "undead_necromancy",
];

// Everything else is narrative_heavy

export function detectCampaignType(theme?: string): CampaignType {
  if (!theme) return "balanced";
  if (COMBAT_HEAVY_THEMES.includes(theme as CampaignTheme)) return "combat_heavy";
  if (BALANCED_THEMES.includes(theme as CampaignTheme)) return "balanced";
  return "narrative_heavy";
}

// ── Thematic enemies by campaign theme ────────────────────────────

/**
 * Preferred monster names per campaign theme. The progression engine
 * tries these first before falling back to pickEncounterMonster().
 */
export const THEMATIC_ENEMIES: Partial<Record<CampaignTheme, string[]>> = {
  dungeon_crawl: ["Skeleton", "Zombie", "Gelatinous Cube", "Mimic", "Animated Armor", "Ghoul", "Specter"],
  wilderness_hex: ["Wolf", "Dire Wolf", "Owlbear", "Giant Spider", "Stirge", "Brown Bear", "Vine Blight"],
  urban_intrigue: ["Thug", "Spy", "Bandit Captain", "Assassin", "Cult Fanatic", "Shadow"],
  horror: ["Shadow", "Specter", "Ghost", "Will-o'-Wisp", "Night Hag", "Wraith"],
  war_military: ["Knight", "Veteran", "Berserker", "Guard", "Bandit Captain"],
  planar: ["Mephit (any)", "Imp", "Quasit", "Shadow", "Will-o'-Wisp"],
  mystery: ["Doppelganger", "Spy", "Animated Armor", "Rug of Smothering"],
  heist: ["Guard", "Spy", "Animated Armor", "Flying Sword"],
  survival: ["Wolf", "Giant Rat", "Stirge", "Swarm of Insects", "Brown Bear"],
  seafaring: ["Sahuagin", "Merrow", "Giant Crab", "Reef Shark", "Sea Hag"],
  underdark: ["Drow", "Quaggoth", "Piercer", "Darkmantle", "Hook Horror", "Phase Spider"],
  dragon_focused: ["Kobold", "Guard Drake", "Pseudodragon", "Young White Dragon"],
  undead_necromancy: ["Skeleton", "Zombie", "Ghoul", "Wight", "Wraith", "Specter", "Shadow"],
  fey_nature: ["Sprite", "Dryad", "Blink Dog", "Pixie", "Twig Blight", "Vine Blight"],
  desert_arabian: ["Giant Scorpion", "Mummy", "Dust Mephit", "Jackalwere", "Yuan-ti Pureblood"],
  norse_viking: ["Berserker", "Dire Wolf", "Ice Mephit", "Wight", "Troll"],
  gothic: ["Vampire Spawn", "Dire Wolf", "Ghost", "Specter", "Strahd Zombie"],
};

// ── Danger assessment ─────────────────────────────────────────────

/** Location keywords and their base danger scores (0–10) */
const LOCATION_DANGER: Record<string, number> = {
  dungeon: 8, crypt: 8, tomb: 8, lair: 9, cave: 7,
  ruins: 7, catacomb: 8, labyrinth: 8,
  forest: 5, woods: 5, swamp: 6, marsh: 6, mountain: 5,
  desert: 5, tundra: 5, jungle: 6, wasteland: 7,
  alley: 4, docks: 4, warehouse: 4, sewer: 6,
  outskirts: 3, road: 3, trail: 3, pass: 4,
  tavern: 1, inn: 1, market: 2, bazaar: 2, shop: 1,
  temple: 2, church: 1, library: 1, academy: 1,
  palace: 3, castle: 4, tower: 5, keep: 4,
  village: 1, town: 1, city: 2, port: 2,
};

export interface DangerContext {
  location: string;
  campaignTheme?: string;
  turnsSinceCombat: number;
  turnsSinceCheck: number;
  turnsSinceLastEscalation: number;
  recentFailedChecks: number;
  playerHpPercent: number; // 0–1
  playerLevel: number;
  narrativeHints: string[]; // recent narrative snippets for context
  /** Last 3 DM responses (most recent first) for weighted narrative analysis */
  recentDMResponses?: string[];
}

/**
 * Assess the current danger level on a 0–10 scale.
 *
 * Factors:
 *   - Base location danger (from LOCATION_DANGER keywords)
 *   - Campaign type modifier (+2 combat_heavy, +0 balanced, -1 narrative_heavy)
 *   - Turns since last combat (slowly increases danger)
 *   - Recent failed checks (implies rising tension)
 *   - Low HP penalty (reduces danger to give breathing room)
 *   - Narrative hints (movement words, stealth failures increase danger)
 */
export function assessDangerLevel(ctx: DangerContext): number {
  const locLower = ctx.location.toLowerCase();

  // Base danger from location keywords
  let danger = 2; // default for unknown locations
  const matchedKeywords: string[] = [];
  for (const [keyword, score] of Object.entries(LOCATION_DANGER)) {
    if (locLower.includes(keyword)) {
      matchedKeywords.push(`${keyword}(${score})`);
      danger = Math.max(danger, score);
    }
  }

  // Campaign type modifier
  const campaignType = detectCampaignType(ctx.campaignTheme);
  if (campaignType === "combat_heavy") danger += 2;
  else if (campaignType === "narrative_heavy") danger -= 1;

  // Turns since combat — gradual pressure
  // Threshold varies by campaign type
  const combatInterval = campaignType === "combat_heavy" ? 4
    : campaignType === "balanced" ? 6
    : 8;

  if (ctx.turnsSinceCombat > combatInterval) {
    danger += Math.min(3, Math.floor((ctx.turnsSinceCombat - combatInterval) / 2));
  }

  // Failed checks indicate rising tension
  if (ctx.recentFailedChecks >= 2) danger += 1;
  if (ctx.recentFailedChecks >= 4) danger += 1;

  // Low HP — reduce danger to allow recovery
  if (ctx.playerHpPercent < 0.3) danger -= 3;
  else if (ctx.playerHpPercent < 0.5) danger -= 1;

  // Narrative analysis — weighted across recent DM responses
  // Weights: most recent 50%, second 30%, oldest 20%
  const DANGER_KEYWORDS = /stealth|sneak|creep|skulk|shadow|dark|threat|danger|lurk|hunt|stalk|prowl/i;
  const FAILURE_KEYWORDS = /fail|stumble|trip|noise|alert|spotted|noticed|caught|exposed|detected/i;
  const TENSION_KEYWORDS = /scream|blood|claw|fang|growl|snarl|hiss|rumble|quake|crack|shatter/i;
  const WEIGHTS = [0.5, 0.3, 0.2];

  const responses = ctx.recentDMResponses ?? ctx.narrativeHints;
  let narrativeDanger = 0;

  for (let i = 0; i < Math.min(responses.length, 3); i++) {
    const text = responses[i];
    const weight = WEIGHTS[i] ?? 0.1;
    let score = 0;
    if (DANGER_KEYWORDS.test(text)) score += 1;
    if (FAILURE_KEYWORDS.test(text)) score += 1;
    if (TENSION_KEYWORDS.test(text)) score += 1;
    narrativeDanger += score * weight;
  }

  // narrativeDanger ranges 0–4.5 in theory; scale to 0–3 contribution
  if (narrativeDanger >= 2.0 && danger >= 4) danger += 2;
  else if (narrativeDanger >= 1.0 && danger >= 3) danger += 1;

  const finalScore = Math.max(0, Math.min(10, danger));
  console.log(`DANGER ASSESSMENT location=${ctx.location} keywords found=[${matchedKeywords.join(", ")}] score=${finalScore}`);
  return finalScore;
}

// ── Escalation result ─────────────────────────────────────────────

export type EscalationType =
  | "none"
  | "combat"       // inject a [COMBAT_START] encounter
  | "tension"      // narrative tension — ominous signs, no combat
  | "environment"  // environmental hazard (trap, weather, terrain)
  | "revelation"   // major story revelation for urban/mystery campaigns
  ;

export interface EscalationResult {
  type: EscalationType;
  /** Monster to fight (only for type === "combat") */
  monster?: Monster;
  /** Narrative text to append */
  narrativeInjection: string;
  /** If type === "combat", the [COMBAT_START] tag value */
  combatStartTag?: string;
}

// ── Narrative injection pools ─────────────────────────────────────

const TENSION_NARRATIVES = [
  "A cold draft carries the faint scent of decay. Something stirs in the darkness ahead.",
  "The hairs on the back of your neck rise. You are being watched.",
  "Distant footsteps echo off stone walls — then stop abruptly.",
  "A low growl reverberates from somewhere unseen. The air grows heavy.",
  "Scratch marks line the walls here, deep and recent. Whatever made them is close.",
  "The torchlight flickers and dims. Shadows stretch unnaturally along the corridor.",
  "A warning cry of birds erupts from the treeline. Something has disturbed them.",
];

const ENVIRONMENT_NARRATIVES = [
  "The ground gives way beneath your feet — loose stone crumbles into a shallow pit.",
  "A gust of acrid wind blows through, stinging your eyes and carrying the taste of sulfur.",
  "The path narrows dangerously, slick stone flanked by a steep drop.",
  "Thick webs stretch across the passage, glistening with fresh moisture.",
  "A sudden tremor shakes dust from the ceiling. Cracks spider-web across the stone above.",
];

const REVELATION_NARRATIVES = [
  "ESCALATION:REVELATION — A trusted ally's mask slips. Reveal a major betrayal, hidden identity, or shocking secret that reframes everything the player thought they knew.",
  "ESCALATION:REVELATION — A critical clue surfaces that connects seemingly unrelated events. The conspiracy runs deeper than anyone suspected.",
  "ESCALATION:REVELATION — Someone the player trusted is not who they claimed to be. Reveal their true allegiance in a dramatic confrontation.",
  "ESCALATION:REVELATION — A document, letter, or overheard conversation exposes a truth that changes everything about the current quest.",
];

/** Campaign themes that qualify for revelation escalation */
const REVELATION_THEMES: CampaignTheme[] = [
  "urban_intrigue", "mystery", "political", "heist", "gothic",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Core escalation logic ─────────────────────────────────────────

/**
 * Determine what escalation (if any) should happen this turn.
 *
 * Decision thresholds (danger 0–10):
 *   0–3:  No escalation (safe areas, low tension)
 *   4–5:  20% chance of tension narrative
 *   6–7:  40% tension, 20% combat
 *   8–9:  30% tension, 50% combat
 *   10:   80% combat, 20% tension (guaranteed something happens)
 */
export function getNextEscalation(ctx: DangerContext): EscalationResult {
  const danger = assessDangerLevel(ctx);

  // Revelation escalation for urban/mystery campaigns after 5+ quiet turns
  const theme = ctx.campaignTheme as CampaignTheme | undefined;
  if (theme && REVELATION_THEMES.includes(theme) && ctx.turnsSinceLastEscalation >= 5) {
    return {
      type: "revelation",
      narrativeInjection: pickRandom(REVELATION_NARRATIVES),
    };
  }

  // No escalation in safe areas
  if (danger <= 3) {
    return { type: "none", narrativeInjection: "" };
  }

  const roll = Math.random();

  if (danger <= 5) {
    // Low danger: occasional tension
    if (roll < 0.20) {
      return {
        type: "tension",
        narrativeInjection: pickRandom(TENSION_NARRATIVES),
      };
    }
    return { type: "none", narrativeInjection: "" };
  }

  if (danger <= 7) {
    // Medium danger: tension or combat
    if (roll < 0.20) {
      return pickCombatEscalation(ctx);
    }
    if (roll < 0.60) {
      return {
        type: roll < 0.50 ? "tension" : "environment",
        narrativeInjection: roll < 0.50
          ? pickRandom(TENSION_NARRATIVES)
          : pickRandom(ENVIRONMENT_NARRATIVES),
      };
    }
    return { type: "none", narrativeInjection: "" };
  }

  if (danger <= 9) {
    // High danger: likely combat or tension
    if (roll < 0.50) {
      return pickCombatEscalation(ctx);
    }
    if (roll < 0.80) {
      return {
        type: "tension",
        narrativeInjection: pickRandom(TENSION_NARRATIVES),
      };
    }
    return { type: "none", narrativeInjection: "" };
  }

  // Extreme danger (10): guaranteed escalation
  if (roll < 0.80) {
    return pickCombatEscalation(ctx);
  }
  return {
    type: "tension",
    narrativeInjection: pickRandom(TENSION_NARRATIVES),
  };
}

/**
 * Build a combat escalation result using thematic enemies when possible.
 */
function pickCombatEscalation(ctx: DangerContext): EscalationResult {
  const theme = ctx.campaignTheme as CampaignTheme | undefined;

  // Try thematic enemies first
  let monster: Monster | null = null;
  if (theme && THEMATIC_ENEMIES[theme]) {
    const candidates = THEMATIC_ENEMIES[theme]!;
    // Shuffle and try each until we find one in the DB
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (const name of shuffled) {
      const found = getMonsterByName(name);
      if (found && found.cr <= Math.max(1, ctx.playerLevel + 1)) {
        monster = found;
        break;
      }
    }
  }

  // Fall back to location-based encounter
  if (!monster) {
    monster = pickEncounterMonster(ctx.location, ctx.playerLevel);
  }

  if (!monster) {
    // Couldn't find any monster — fall back to tension
    return {
      type: "tension",
      narrativeInjection: pickRandom(TENSION_NARRATIVES),
    };
  }

  const combatTag = `${monster.name} HP:${monster.hp} AC:${monster.ac}`;

  return {
    type: "combat",
    monster,
    narrativeInjection: buildCombatInjectionNarrative(monster),
    combatStartTag: combatTag,
  };
}

function buildCombatInjectionNarrative(monster: Monster): string {
  const name = monster.name.toLowerCase();
  const article = /^[aeiou]/i.test(monster.name) ? "an" : "a";

  const intros = [
    `A shape emerges from the shadows — ${article} ${name} blocks your path, eyes gleaming with predatory intent.`,
    `Without warning, ${article} ${name} lunges from concealment, fangs bared and claws ready.`,
    `The stillness shatters as ${article} ${name} springs from hiding, cutting off your retreat.`,
    `A guttural snarl is your only warning before ${article} ${name} charges from the darkness.`,
    `You round the corner and find yourself face to face with ${article} ${name}, already tensed to strike.`,
  ];

  return pickRandom(intros);
}
