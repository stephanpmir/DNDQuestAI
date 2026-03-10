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
  race: Race;
  class: CharacterClass;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  abilityScores: AbilityScores;
  inventory: string[];
  gold: number;
}

export function createDefaultCharacter(): Character {
  return {
    name: "",
    race: "Human",
    class: "Fighter",
    level: 1,
    hp: 10,
    maxHp: 10,
    ac: 10,
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
  };
}
