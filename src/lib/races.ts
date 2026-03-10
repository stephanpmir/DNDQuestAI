/**
 * D&D 5e SRD racial data — ability score increases, traits, and features.
 */
import type { Race } from "@/types/character";

export interface RacialData {
  abilityBonuses: Partial<Record<string, number>>;
  speed: number;
  traits: string[];
  /** Languages known */
  languages: string[];
  /** Brief description shown during character creation */
  description: string;
}

/**
 * D&D 5e SRD racial ability score increases and traits.
 * Ability keys: strength, dexterity, constitution, intelligence, wisdom, charisma
 */
export const RACIAL_DATA: Record<Race, RacialData> = {
  Human: {
    abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30,
    traits: ["Extra Language"],
    languages: ["Common", "One extra language"],
    description: "+1 to all ability scores. Versatile and adaptable.",
  },
  Elf: {
    abilityBonuses: { dexterity: 2 },
    speed: 30,
    traits: ["Darkvision (60 ft)", "Keen Senses (Prof. Perception)", "Fey Ancestry", "Trance"],
    languages: ["Common", "Elvish"],
    description: "+2 DEX. Darkvision, proficiency in Perception, immune to magical sleep.",
  },
  Dwarf: {
    abilityBonuses: { constitution: 2 },
    speed: 25,
    traits: ["Darkvision (60 ft)", "Dwarven Resilience (Poison resistance)", "Stonecunning", "Dwarven Combat Training"],
    languages: ["Common", "Dwarvish"],
    description: "+2 CON. Darkvision, poison resistance, stonecunning.",
  },
  Halfling: {
    abilityBonuses: { dexterity: 2 },
    speed: 25,
    traits: ["Lucky (Reroll nat 1s)", "Brave (Adv. vs Frightened)", "Halfling Nimbleness"],
    languages: ["Common", "Halfling"],
    description: "+2 DEX. Lucky (reroll natural 1s), brave, can move through larger creatures.",
  },
  Gnome: {
    abilityBonuses: { intelligence: 2 },
    speed: 25,
    traits: ["Darkvision (60 ft)", "Gnome Cunning (Adv. INT/WIS/CHA saves vs magic)"],
    languages: ["Common", "Gnomish"],
    description: "+2 INT. Darkvision, advantage on mental saves against magic.",
  },
  "Half-Elf": {
    abilityBonuses: { charisma: 2 },
    speed: 30,
    traits: ["Darkvision (60 ft)", "Fey Ancestry", "Skill Versatility (2 extra skill proficiencies)"],
    languages: ["Common", "Elvish", "One extra language"],
    description: "+2 CHA, +1 to two other abilities. Darkvision, 2 extra skill proficiencies.",
  },
  "Half-Orc": {
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    traits: ["Darkvision (60 ft)", "Menacing (Prof. Intimidation)", "Relentless Endurance", "Savage Attacks"],
    languages: ["Common", "Orc"],
    description: "+2 STR, +1 CON. Darkvision, Intimidation prof, drop to 1 HP once instead of 0.",
  },
  Tiefling: {
    abilityBonuses: { charisma: 2, intelligence: 1 },
    speed: 30,
    traits: ["Darkvision (60 ft)", "Hellish Resistance (Fire resistance)", "Infernal Legacy (Thaumaturgy cantrip)"],
    languages: ["Common", "Infernal"],
    description: "+2 CHA, +1 INT. Darkvision, fire resistance, Thaumaturgy cantrip.",
  },
  Dragonborn: {
    abilityBonuses: { strength: 2, charisma: 1 },
    speed: 30,
    traits: ["Breath Weapon (2d6, scales with level)", "Damage Resistance (based on ancestry)"],
    languages: ["Common", "Draconic"],
    description: "+2 STR, +1 CHA. Breath weapon, damage resistance based on draconic ancestry.",
  },
};

/**
 * Half-Elf gets +1 to two abilities of choice (other than CHA).
 * Returns the list of valid ability choices.
 */
export const HALF_ELF_BONUS_CHOICES = [
  "strength", "dexterity", "constitution", "intelligence", "wisdom"
] as const;

/**
 * Apply racial ability score bonuses to base scores.
 */
export function applyRacialBonuses(
  baseScores: Record<string, number>,
  race: Race,
  halfElfBonuses?: [string, string]
): Record<string, number> {
  const result = { ...baseScores };
  const bonuses = RACIAL_DATA[race].abilityBonuses;

  for (const [ability, bonus] of Object.entries(bonuses)) {
    if (bonus) {
      result[ability] = (result[ability] ?? 10) + bonus;
    }
  }

  // Half-Elf: +1 to two chosen abilities
  if (race === "Half-Elf" && halfElfBonuses) {
    for (const ability of halfElfBonuses) {
      result[ability] = (result[ability] ?? 10) + 1;
    }
  }

  return result;
}
