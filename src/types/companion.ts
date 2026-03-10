/**
 * Companion System Types
 *
 * Inspired by D&D 5e Sidekick rules (Tasha's Cauldron),
 * BG3/Dragon Age companion approval, and solo RPG design.
 *
 * Companions are AI-controlled party members that:
 * - Have their own personalities and opinions
 * - React to player moral choices (approval/disapproval)
 * - Contribute to skill checks and combat
 * - Have personal quests and backstories
 * - Can leave or betray the player based on alignment divergence
 */

export const COMPANION_CLASSES = ["warrior", "expert", "spellcaster"] as const;
export type CompanionClass = (typeof COMPANION_CLASSES)[number];

export const COMPANION_DISPOSITIONS = [
  "loyal",       // 75-100 approval
  "friendly",    // 50-74
  "neutral",     // 25-49
  "wary",        // 0-24
  "hostile",     // below 0 — will leave or betray
] as const;
export type CompanionDisposition = (typeof COMPANION_DISPOSITIONS)[number];

/** A companion's moral compass — what they approve/disapprove of */
export interface CompanionPersonality {
  /** What this companion approves of (karma actions) */
  approves: string[];
  /** What this companion disapproves of */
  disapproves: string[];
  /** Personality trait for narration */
  trait: string;
  /** Ideal / belief */
  ideal: string;
  /** Personal flaw */
  flaw: string;
  /** Bond / motivation */
  bond: string;
}

export interface Companion {
  id: string;
  name: string;
  race: string;
  class: CompanionClass;
  level: number;
  hp: number;
  maxHp: number;
  /** Primary ability modifier for their class */
  primaryMod: number;
  /** Approval score: 0-100, starts at 50 */
  approval: number;
  /** Current disposition based on approval */
  disposition: CompanionDisposition;
  /** Moral alignment (good/neutral/evil) — determines reactions */
  moralLeaning: "good" | "neutral" | "evil";
  personality: CompanionPersonality;
  /** Short backstory for the DM to reference */
  backstory: string;
  /** Whether this companion has been recruited */
  isRecruited: boolean;
  /** Whether this companion has left the party */
  hasLeft: boolean;
  /** Turn when recruited */
  recruitedTurn: number;
  /** Personal quest status */
  personalQuest?: string;
  personalQuestComplete: boolean;
}

/** Get disposition from approval score */
export function getDisposition(approval: number): CompanionDisposition {
  if (approval >= 75) return "loyal";
  if (approval >= 50) return "friendly";
  if (approval >= 25) return "neutral";
  if (approval >= 0) return "wary";
  return "hostile";
}

/** Pre-built companion templates that can appear in campaigns */
export const COMPANION_TEMPLATES: Omit<Companion, "isRecruited" | "hasLeft" | "recruitedTurn" | "personalQuestComplete">[] = [
  {
    id: "companion_elara",
    name: "Elara Brightshield",
    race: "Human",
    class: "warrior",
    level: 1,
    hp: 12,
    maxHp: 12,
    primaryMod: 3,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "good",
    personality: {
      approves: ["help_npc", "protect_innocent", "spare_enemy", "honest_dialogue", "free_prisoner"],
      disapproves: ["kill_innocent", "steal", "betray_ally", "desecrate", "intimidate_weak"],
      trait: "Always stands up for those who can't fight for themselves.",
      ideal: "Justice. The strong must protect the weak.",
      flaw: "Can be rigid and judgmental about moral gray areas.",
      bond: "Searching for her missing sister, who was taken by slavers.",
    },
    backstory: "A former town guard who left service after her sister was kidnapped by slavers. She joined the road seeking both justice and her sibling.",
    personalQuest: "Find and rescue my sister from the slavers",
  },
  {
    id: "companion_grimshaw",
    name: "Grimshaw",
    race: "Dwarf",
    class: "warrior",
    level: 1,
    hp: 14,
    maxHp: 14,
    primaryMod: 3,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "neutral",
    personality: {
      approves: ["honest_dialogue", "self_sacrifice", "pragmatic_choice"],
      disapproves: ["betray_ally", "lie_cheat", "desecrate"],
      trait: "Measures people by their deeds, not their words.",
      ideal: "Honor among warriors. Keep your word or keep your silence.",
      flaw: "Drinks too much and gets sentimental about the old days.",
      bond: "The last of his clan. Carries an ancestral axe he's sworn to wield with honor.",
    },
    backstory: "Last survivor of Clan Irondelve after a dragon attack. He travels to honor his clan's memory, carrying their ancestral axe.",
  },
  {
    id: "companion_whisper",
    name: "Whisper",
    race: "Halfling",
    class: "expert",
    level: 1,
    hp: 8,
    maxHp: 8,
    primaryMod: 3,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "neutral",
    personality: {
      approves: ["steal", "lie_cheat", "pragmatic_choice", "free_prisoner"],
      disapproves: ["kill_innocent", "desecrate", "betray_ally"],
      trait: "Always has a backup plan and an escape route.",
      ideal: "Freedom. No one should be in chains, literal or figurative.",
      flaw: "Compulsive thief — can't resist a shiny trinket.",
      bond: "Grew up on the streets. The party is the first real family she's had.",
    },
    backstory: "A street urchin turned skilled thief who learned that survival means being smarter, not stronger. She has a good heart despite sticky fingers.",
    personalQuest: "Find out who my real parents were",
  },
  {
    id: "companion_theron",
    name: "Theron Duskwalker",
    race: "Elf",
    class: "spellcaster",
    level: 1,
    hp: 8,
    maxHp: 8,
    primaryMod: 3,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "good",
    personality: {
      approves: ["honest_dialogue", "help_npc", "protect_innocent", "heal_ally"],
      disapproves: ["desecrate", "kill_innocent", "poison", "loot_corpse"],
      trait: "Speaks in proverbs and ancient sayings. Endlessly patient.",
      ideal: "Knowledge. Understanding prevents more suffering than any sword.",
      flaw: "Too trusting. Believes redemption is always possible.",
      bond: "Sworn to preserve the ancient forest. Its destruction would end his purpose.",
    },
    backstory: "An elven scholar-priest who left his ancient forest to study the world. Believes understanding is the highest virtue.",
    personalQuest: "Recover the lost Tome of Seasons from the corrupted druid grove",
  },
  {
    id: "companion_nyx",
    name: "Nyx Shadowmere",
    race: "Tiefling",
    class: "spellcaster",
    level: 1,
    hp: 7,
    maxHp: 7,
    primaryMod: 3,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "neutral",
    personality: {
      approves: ["pragmatic_choice", "self_sacrifice", "free_prisoner", "intimidate_weak"],
      disapproves: ["betray_ally", "kill_innocent", "honest_dialogue"],
      trait: "Sarcastic and world-weary, hides deep insecurity behind bravado.",
      ideal: "Power. Knowledge of the arcane is freedom from those who would control you.",
      flaw: "Instinctively distrusts authority and institutions.",
      bond: "Made a pact she regrets. Seeks a way to break free from her patron.",
    },
    backstory: "A warlock bound by a pact she made in desperation. She travels seeking enough power to break her contract with her infernal patron.",
    personalQuest: "Find a way to break my infernal pact without losing my powers",
  },
  {
    id: "companion_rowan",
    name: "Rowan Ashford",
    race: "Half-Elf",
    class: "expert",
    level: 1,
    hp: 9,
    maxHp: 9,
    primaryMod: 2,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "good",
    personality: {
      approves: ["help_npc", "heal_ally", "donate_gold", "honest_dialogue", "spare_enemy"],
      disapproves: ["steal", "kill_innocent", "poison", "intimidate_weak"],
      trait: "Optimistic and cheerful even in dark situations. Loves music.",
      ideal: "Compassion. Every person deserves kindness, even enemies.",
      flaw: "Too soft-hearted. Has trouble making hard choices that hurt anyone.",
      bond: "Travels to bring stories and songs to forgotten places. Believes music heals.",
    },
    backstory: "A wandering bard who collects stories from every village and ruin. Believes that stories are how people survive beyond death.",
  },
  {
    id: "companion_vex",
    name: "Vex Ironjaw",
    race: "Half-Orc",
    class: "warrior",
    level: 1,
    hp: 13,
    maxHp: 13,
    primaryMod: 4,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "evil",
    personality: {
      approves: ["intimidate_weak", "steal", "pragmatic_choice", "self_sacrifice"],
      disapproves: ["spare_enemy", "donate_gold", "honest_dialogue"],
      trait: "Believes strength is the only law. Respects those who prove themselves.",
      ideal: "Might. The strong take what they want. That's how the world works.",
      flaw: "Quick to violence. Sees mercy as weakness.",
      bond: "Exiled from his tribe for showing mercy once. Determined never to be weak again.",
    },
    backstory: "A half-orc warrior exiled from his tribe for sparing an enemy. Now he overcompensates, embracing brutality to prove he's not weak.",
    personalQuest: "Return to my tribe and prove my strength to regain my honor",
  },
  {
    id: "companion_sister_grace",
    name: "Sister Grace",
    race: "Human",
    class: "spellcaster",
    level: 1,
    hp: 8,
    maxHp: 8,
    primaryMod: 3,
    approval: 50,
    disposition: "friendly",
    moralLeaning: "good",
    personality: {
      approves: ["heal_ally", "help_npc", "protect_innocent", "spare_enemy", "honest_dialogue", "free_prisoner", "self_sacrifice", "donate_gold"],
      disapproves: ["kill_innocent", "steal", "desecrate", "poison", "betray_ally", "intimidate_weak", "loot_corpse"],
      trait: "Calm and compassionate. Sees the divine in everyone.",
      ideal: "Mercy. Healing is the highest calling.",
      flaw: "Refuses to kill, even when lives depend on it.",
      bond: "Sworn to her temple. Will not rest while suffering exists.",
    },
    backstory: "A temple healer who ventured into the world to bring aid where it's needed most. Her faith is unshakeable but sometimes naive.",
    personalQuest: "Restore the desecrated shrine of my goddess in the Blighted Lands",
  },
];

/**
 * Calculate companion approval change based on a karma action.
 * Companions react differently based on their moral leaning.
 */
export function calculateApprovalChange(
  companion: Companion,
  karmaAction: string
): number {
  if (companion.personality.approves.includes(karmaAction)) {
    return companion.moralLeaning === "good" ? 8 : 5;
  }
  if (companion.personality.disapproves.includes(karmaAction)) {
    return companion.moralLeaning === "good" ? -10 : -5;
  }
  return 0;
}

/** Build companion context for the DM prompt */
export function buildCompanionContext(companions: Companion[]): string {
  const active = companions.filter((c) => c.isRecruited && !c.hasLeft);
  if (active.length === 0) return "";

  const lines: string[] = ["## Companions"];

  for (const c of active) {
    lines.push(`- **${c.name}** (${c.race} ${c.class}, L${c.level}): ${c.personality.trait}`);
    lines.push(`  HP: ${c.hp}/${c.maxHp} | Disposition: ${c.disposition} | Moral: ${c.moralLeaning}`);
    if (c.personalQuest && !c.personalQuestComplete) {
      lines.push(`  Personal Quest: ${c.personalQuest}`);
    }
  }

  lines.push("\nCompanions should be woven into the narrative — they speak, react, and act. They have opinions about the player's choices. Reference their personalities.");

  return lines.join("\n");
}
