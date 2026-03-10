export const GENDERS = ["Male", "Female"] as const;
export type Gender = (typeof GENDERS)[number];

export const RACES = [
  "Human",
  "Elf",
  "Dwarf",
  "Halfling",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Tiefling",
  "Dragonborn",
] as const;

export type Race = (typeof RACES)[number];

export const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;

export type CharacterClass = (typeof CLASSES)[number];

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  wisdom: number;
  intelligence: number;
  charisma: number;
}

export interface Character {
  name: string;
  gender: Gender;
  race: Race;
  class: CharacterClass;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  xp: number;
  xpToNextLevel: number;
  abilityScores: AbilityScores;
  inventory: string[];
  gold: number;
  /** Turn number of last rest (-1 = never rested) */
  lastRestTurn: number;
  /** Death save state when at 0 HP */
  deathSaves: { successes: number; failures: number };
  /** Is the character unconscious (0 HP)? */
  isUnconscious: boolean;
  /** Is the character dead (3 death save failures)? */
  isDead: boolean;
  /** Karma score: -100 (evil) to +100 (good), starts at 0 */
  karma: number;
  /** Selected campaign theme */
  campaignTheme?: string;
  /** Selected campaign template ID */
  campaignId?: string;
}

/** D&D 5e XP thresholds for levels 1-20 */
export const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000,
  8: 34000, 9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000,
  14: 140000, 15: 165000, 16: 195000, 17: 225000, 18: 265000,
  19: 305000, 20: 355000,
};

export function getXpToNextLevel(level: number): number {
  const next = XP_THRESHOLDS[level + 1];
  return next ?? Infinity;
}

export function createDefaultCharacter(): Character {
  return {
    name: "",
    gender: "Male",
    race: "Human",
    class: "Fighter",
    level: 1,
    hp: 10,
    maxHp: 10,
    ac: 10,
    xp: 0,
    xpToNextLevel: XP_THRESHOLDS[2],
    abilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      wisdom: 10,
      intelligence: 10,
      charisma: 10,
    },
    inventory: [],
    gold: 15,
    lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 },
    isUnconscious: false,
    isDead: false,
    karma: 0,
  };
}
