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

export const HAIR_STYLES = ["short", "long", "ponytail", "mohawk", "bald", "braids"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HAIR_COLORS = [
  { name: "Black", value: "#1a1a2e" },
  { name: "Brown", value: "#5c3a1e" },
  { name: "Auburn", value: "#8b3a2a" },
  { name: "Blonde", value: "#d4a843" },
  { name: "Red", value: "#c0392b" },
  { name: "White", value: "#dcdcdc" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
] as const;

export const SKIN_TONES = [
  { name: "Pale", value: "#fde8d0" },
  { name: "Light", value: "#f5d0a9" },
  { name: "Medium", value: "#d4a574" },
  { name: "Tan", value: "#b8804a" },
  { name: "Brown", value: "#8d5524" },
  { name: "Dark", value: "#5c3310" },
  { name: "Ashen", value: "#8a8a9a" },
  { name: "Green", value: "#6b8e5a" },
] as const;

export const BODY_BUILDS = ["slim", "average", "muscular", "heavy"] as const;
export type BodyBuild = (typeof BODY_BUILDS)[number];

export const HEIGHT_OPTIONS = ["short", "average", "tall"] as const;
export type HeightOption = (typeof HEIGHT_OPTIONS)[number];

export interface AvatarCustomization {
  hairStyle: HairStyle;
  hairColor: string;
  skinTone: string;
  bodyBuild: BodyBuild;
  height: HeightOption;
}

export interface BeginnerSurvey {
  playstyle: "fighting" | "sneaking" | "magic" | "talking";
  teamRole: "lone-wolf" | "team-player" | "leader";
  riskStyle: "cautious" | "balanced" | "reckless";
  theme: "nature" | "holy" | "arcane" | "shadow" | "martial";
  complexity: "simple" | "moderate" | "complex";
}

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
  /** Items currently worn/equipped (subset of inventory) */
  equipped: string[];
  /** Magical items the player has identified */
  identifiedItems: string[];
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
  /** Fame score: 0 (unknown) to 100 (legendary), starts at 0 */
  fame: number;
  /** Skill proficiencies chosen during creation */
  skillProficiencies: string[];
  /** Known cantrips (casters only) */
  cantrips: string[];
  /** Known/prepared spells (casters only) */
  spells: string[];
  /** Fighting style (Fighter/Paladin/Ranger) */
  fightingStyle?: string;
  /** Racial traits active on this character */
  racialTraits: string[];
  /** Half-Elf bonus ability choices */
  halfElfBonuses?: [string, string];
  /** Selected campaign theme */
  campaignTheme?: string;
  /** Selected campaign template ID */
  campaignId?: string;
  /** Avatar appearance customization */
  avatar: AvatarCustomization;
  /** Beginner survey answers (undefined if skipped) */
  beginnerSurvey?: BeginnerSurvey;
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
    equipped: [],
    identifiedItems: [],
    gold: 15,
    lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 },
    isUnconscious: false,
    isDead: false,
    karma: 0,
    fame: 0,
    skillProficiencies: [],
    cantrips: [],
    spells: [],
    racialTraits: [],
    avatar: {
      hairStyle: "short",
      hairColor: "#5c3a1e",
      skinTone: "#f5d0a9",
      bodyBuild: "average",
      height: "average",
    },
  };
}
