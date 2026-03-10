/**
 * D&D 5e SRD class data — skill choices, starting features, cantrips, and spells.
 */
import type { CharacterClass } from "@/types/character";

export interface ClassData {
  /** Hit die size */
  hitDie: number;
  /** Number of skills the player chooses from the list */
  skillChoiceCount: number;
  /** Available skills to choose from */
  skillChoices: string[];
  /** Class features at level 1 */
  features: string[];
  /** Number of cantrips known at level 1 (0 for non-casters) */
  cantripsKnown: number;
  /** Available cantrips to choose from */
  cantrips: string[];
  /** Number of 1st-level spells known/prepared at level 1 */
  spellsKnown: number;
  /** Available 1st-level spells */
  spells: string[];
  /** Primary ability for the class */
  primaryAbility: string;
  /** Saving throw proficiencies */
  savingThrows: [string, string];
  /** Brief description shown during creation */
  description: string;
}

export const CLASS_DATA: Record<CharacterClass, ClassData> = {
  Barbarian: {
    hitDie: 12,
    skillChoiceCount: 2,
    skillChoices: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
    features: ["Rage (2/day, +2 dmg)", "Unarmored Defense (AC = 10 + DEX + CON)"],
    cantripsKnown: 0, cantrips: [], spellsKnown: 0, spells: [],
    primaryAbility: "Strength",
    savingThrows: ["STR", "CON"],
    description: "A fierce warrior who channels primal rage for devastating melee attacks.",
  },
  Bard: {
    hitDie: 8,
    skillChoiceCount: 3,
    skillChoices: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
    features: ["Bardic Inspiration (d6, CHA/day)", "Spellcasting (CHA)"],
    cantripsKnown: 2,
    cantrips: ["Blade Ward", "Dancing Lights", "Friends", "Light", "Mage Hand", "Mending", "Message", "Minor Illusion", "Prestidigitation", "True Strike", "Vicious Mockery"],
    spellsKnown: 4,
    spells: ["Charm Person", "Cure Wounds", "Detect Magic", "Disguise Self", "Faerie Fire", "Feather Fall", "Healing Word", "Heroism", "Identify", "Silent Image", "Sleep", "Speak with Animals", "Tasha's Hideous Laughter", "Thunderwave", "Unseen Servant"],
    primaryAbility: "Charisma",
    savingThrows: ["DEX", "CHA"],
    description: "A magical performer who weaves spells through music and inspires allies.",
  },
  Cleric: {
    hitDie: 8,
    skillChoiceCount: 2,
    skillChoices: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    features: ["Spellcasting (WIS)", "Divine Domain (Life)"],
    cantripsKnown: 3,
    cantrips: ["Guidance", "Light", "Mending", "Resistance", "Sacred Flame", "Spare the Dying", "Thaumaturgy"],
    spellsKnown: 0, // Clerics prepare WIS mod + level spells
    spells: ["Bless", "Command", "Create or Destroy Water", "Cure Wounds", "Detect Evil and Good", "Detect Magic", "Detect Poison and Disease", "Guiding Bolt", "Healing Word", "Inflict Wounds", "Protection from Evil and Good", "Purify Food and Drink", "Sanctuary", "Shield of Faith"],
    primaryAbility: "Wisdom",
    savingThrows: ["WIS", "CHA"],
    description: "A divine spellcaster who channels the power of their deity to heal and protect.",
  },
  Druid: {
    hitDie: 8,
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
    features: ["Druidic (secret language)", "Spellcasting (WIS)"],
    cantripsKnown: 2,
    cantrips: ["Druidcraft", "Guidance", "Mending", "Poison Spray", "Produce Flame", "Resistance", "Shillelagh", "Thorn Whip"],
    spellsKnown: 0, // Druids prepare WIS mod + level spells
    spells: ["Animal Friendship", "Charm Person", "Create or Destroy Water", "Cure Wounds", "Detect Magic", "Detect Poison and Disease", "Entangle", "Faerie Fire", "Fog Cloud", "Goodberry", "Healing Word", "Jump", "Longstrider", "Purify Food and Drink", "Speak with Animals", "Thunderwave"],
    primaryAbility: "Wisdom",
    savingThrows: ["INT", "WIS"],
    description: "A nature priest who draws on the forces of the natural world for spells and shape-shifting.",
  },
  Fighter: {
    hitDie: 10,
    skillChoiceCount: 2,
    skillChoices: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
    features: ["Fighting Style", "Second Wind (1d10+1 heal, 1/rest)"],
    cantripsKnown: 0, cantrips: [], spellsKnown: 0, spells: [],
    primaryAbility: "Strength",
    savingThrows: ["STR", "CON"],
    description: "A master of martial combat with superior physical prowess and tactical skill.",
  },
  Monk: {
    hitDie: 8,
    skillChoiceCount: 2,
    skillChoices: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
    features: ["Unarmored Defense (AC = 10 + DEX + WIS)", "Martial Arts (d4 unarmed, bonus attack)"],
    cantripsKnown: 0, cantrips: [], spellsKnown: 0, spells: [],
    primaryAbility: "Dexterity",
    savingThrows: ["STR", "DEX"],
    description: "A martial artist whose mastery of body and mind grants supernatural abilities.",
  },
  Paladin: {
    hitDie: 10,
    skillChoiceCount: 2,
    skillChoices: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
    features: ["Divine Sense", "Lay on Hands (5 HP pool)"],
    cantripsKnown: 0, cantrips: [], spellsKnown: 0, spells: [],
    primaryAbility: "Strength",
    savingThrows: ["WIS", "CHA"],
    description: "A holy warrior bound by an oath, wielding divine magic and martial might.",
  },
  Ranger: {
    hitDie: 10,
    skillChoiceCount: 3,
    skillChoices: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
    features: ["Favored Enemy", "Natural Explorer"],
    cantripsKnown: 0, cantrips: [], spellsKnown: 0, spells: [],
    primaryAbility: "Dexterity",
    savingThrows: ["STR", "DEX"],
    description: "A wilderness warrior skilled in tracking, survival, and ranged combat.",
  },
  Rogue: {
    hitDie: 8,
    skillChoiceCount: 4,
    skillChoices: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
    features: ["Expertise (2 skills)", "Sneak Attack (1d6)", "Thieves' Cant"],
    cantripsKnown: 0, cantrips: [], spellsKnown: 0, spells: [],
    primaryAbility: "Dexterity",
    savingThrows: ["DEX", "INT"],
    description: "A cunning expert in stealth, trickery, and precise, devastating strikes.",
  },
  Sorcerer: {
    hitDie: 6,
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
    features: ["Spellcasting (CHA)", "Sorcerous Origin (Draconic Bloodline)"],
    cantripsKnown: 4,
    cantrips: ["Acid Splash", "Blade Ward", "Chill Touch", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Mending", "Message", "Minor Illusion", "Poison Spray", "Prestidigitation", "Ray of Frost", "Shocking Grasp", "True Strike"],
    spellsKnown: 2,
    spells: ["Burning Hands", "Charm Person", "Chromatic Orb", "Color Spray", "Comprehend Languages", "Detect Magic", "Disguise Self", "Expeditious Retreat", "False Life", "Feather Fall", "Fog Cloud", "Jump", "Mage Armor", "Magic Missile", "Ray of Sickness", "Shield", "Silent Image", "Sleep", "Thunderwave", "Witch Bolt"],
    primaryAbility: "Charisma",
    savingThrows: ["CON", "CHA"],
    description: "An innate spellcaster who draws on their bloodline for raw magical power.",
  },
  Warlock: {
    hitDie: 8,
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
    features: ["Otherworldly Patron (The Fiend)", "Pact Magic (CHA, 1 slot)"],
    cantripsKnown: 2,
    cantrips: ["Blade Ward", "Chill Touch", "Eldritch Blast", "Friends", "Mage Hand", "Minor Illusion", "Poison Spray", "Prestidigitation", "True Strike"],
    spellsKnown: 2,
    spells: ["Armor of Agathys", "Arms of Hadar", "Charm Person", "Comprehend Languages", "Expeditious Retreat", "Hellish Rebuke", "Hex", "Illusory Script", "Protection from Evil and Good", "Unseen Servant", "Witch Bolt"],
    primaryAbility: "Charisma",
    savingThrows: ["WIS", "CHA"],
    description: "A spellcaster who derives power from a pact with an otherworldly entity.",
  },
  Wizard: {
    hitDie: 6,
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
    features: ["Spellcasting (INT)", "Arcane Recovery (1/day, recover spell slots on short rest)"],
    cantripsKnown: 3,
    cantrips: ["Acid Splash", "Blade Ward", "Chill Touch", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Mending", "Message", "Minor Illusion", "Poison Spray", "Prestidigitation", "Ray of Frost", "Shocking Grasp", "True Strike"],
    spellsKnown: 6, // Wizard starts with 6 spells in spellbook, prepares INT mod + level
    spells: ["Alarm", "Burning Hands", "Charm Person", "Color Spray", "Comprehend Languages", "Detect Magic", "Disguise Self", "Expeditious Retreat", "False Life", "Feather Fall", "Find Familiar", "Fog Cloud", "Grease", "Identify", "Jump", "Longstrider", "Mage Armor", "Magic Missile", "Protection from Evil and Good", "Ray of Sickness", "Shield", "Silent Image", "Sleep", "Tasha's Hideous Laughter", "Thunderwave", "Unseen Servant", "Witch Bolt"],
    primaryAbility: "Intelligence",
    savingThrows: ["INT", "WIS"],
    description: "A scholarly spellcaster who studies arcane magic through intellect and research.",
  },
};

/**
 * Fighting styles for Fighter, Paladin, Ranger
 */
export const FIGHTING_STYLES: Record<string, string[]> = {
  Fighter: ["Archery (+2 ranged attack)", "Defense (+1 AC in armor)", "Dueling (+2 dmg one-handed)", "Great Weapon Fighting (reroll 1-2 dmg with two-handed)", "Protection (impose disadvantage on attacks vs adjacent ally)", "Two-Weapon Fighting (add ability mod to off-hand damage)"],
  Paladin: ["Defense (+1 AC in armor)", "Dueling (+2 dmg one-handed)", "Great Weapon Fighting (reroll 1-2 dmg with two-handed)", "Protection (impose disadvantage on attacks vs adjacent ally)"],
  Ranger: ["Archery (+2 ranged attack)", "Defense (+1 AC in armor)", "Dueling (+2 dmg one-handed)", "Two-Weapon Fighting (add ability mod to off-hand damage)"],
};

/**
 * Get the number of prepared spells for prepare-style casters (Cleric, Druid, Wizard).
 * Returns spellsKnown for known-style casters (Bard, Sorcerer, Warlock).
 */
export function getSpellSlots(cls: CharacterClass, level: number, abilityMod: number): number {
  const data = CLASS_DATA[cls];
  if (data.spellsKnown > 0) return data.spellsKnown; // Known casters
  // Prepared casters: ability mod + level, minimum 1
  if (data.spells.length > 0) return Math.max(1, abilityMod + level);
  return 0;
}
