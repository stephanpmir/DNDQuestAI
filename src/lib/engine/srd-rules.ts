/**
 * D&D 5e SRD Rules Reference
 *
 * Static, authoritative data used by the rules engine and available to the LLM
 * via the DM system prompt. All values come from the D&D 5e SRD / PHB.
 *
 * ─── IMPORTANT ───────────────────────────────────────────────────────────────
 * This file is the SINGLE SOURCE OF TRUTH for game mechanics.
 * If a value here disagrees with rules.ts, races.ts, classes.ts, or items.ts,
 * THIS FILE is correct and the other should be updated to match.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. ABILITY SCORES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ABILITIES = [
  "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
] as const;

export type Ability = (typeof ABILITIES)[number];

/** Ability modifier = floor((score − 10) / 2) */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SKILLS — D&D 5e PHB p.174
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SkillDef {
  name: string;
  ability: Ability;
}

export const SKILLS: SkillDef[] = [
  // Strength
  { name: "Athletics",        ability: "strength" },
  // Dexterity
  { name: "Acrobatics",       ability: "dexterity" },
  { name: "Sleight of Hand",  ability: "dexterity" },
  { name: "Stealth",          ability: "dexterity" },
  // Intelligence
  { name: "Arcana",           ability: "intelligence" },
  { name: "History",          ability: "intelligence" },
  { name: "Investigation",    ability: "intelligence" },
  { name: "Nature",           ability: "intelligence" },
  { name: "Religion",         ability: "intelligence" },
  // Wisdom
  { name: "Animal Handling",  ability: "wisdom" },
  { name: "Insight",          ability: "wisdom" },
  { name: "Medicine",         ability: "wisdom" },
  { name: "Perception",       ability: "wisdom" },
  { name: "Survival",         ability: "wisdom" },
  // Charisma
  { name: "Deception",        ability: "charisma" },
  { name: "Intimidation",     ability: "charisma" },
  { name: "Performance",      ability: "charisma" },
  { name: "Persuasion",       ability: "charisma" },
];

/** Look up the governing ability for a skill name (case-insensitive). */
export function skillAbility(skillName: string): Ability {
  const lower = skillName.toLowerCase();
  const found = SKILLS.find((s) => s.name.toLowerCase() === lower);
  return found?.ability ?? "wisdom"; // default fallback
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PROFICIENCY BONUS — PHB p.15
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Proficiency bonus by character level: +2 at L1-4, +3 at L5-8, … +6 at L17-20 */
export function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. XP THRESHOLDS — PHB p.15
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000,
  8: 34000, 9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000,
  14: 140000, 15: 165000, 16: 195000, 17: 225000, 18: 265000,
  19: 305000, 20: 355000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. XP REWARDS (game-specific scaling)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Combat XP by character level (~10-15 combats per level) */
export const COMBAT_XP: number[] = [
  25, 50, 75, 100, 150, 200, 250, 350, 450, 550,
  650, 800, 950, 1100, 1300, 1500, 1700, 2000, 2300, 2600,
];

export function combatXpReward(level: number): number {
  return COMBAT_XP[Math.min(level - 1, 19)];
}

/** Skill check XP = combat XP / 5 */
export function skillCheckXpReward(level: number): number {
  return Math.max(5, Math.floor(combatXpReward(level) / 5));
}

/** Exploration XP = combat XP / 10 */
export function explorationXpReward(level: number): number {
  return Math.max(3, Math.floor(combatXpReward(level) / 10));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. RACES — PHB Chapter 2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RaceDef {
  name: string;
  abilityBonuses: Partial<Record<Ability, number>>;
  speed: number;
  traits: string[];
  languages: string[];
}

export const RACES: RaceDef[] = [
  {
    name: "Human",
    abilityBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30,
    traits: ["Extra Language"],
    languages: ["Common", "One extra"],
  },
  {
    name: "Elf",
    abilityBonuses: { dexterity: 2 },
    speed: 30,
    traits: [
      "Darkvision (60 ft)",
      "Keen Senses — proficiency in Perception",
      "Fey Ancestry — advantage on saves vs charmed; immune to magical sleep",
      "Trance — 4 hours of meditation replaces 8 hours of sleep",
    ],
    languages: ["Common", "Elvish"],
  },
  {
    name: "Dwarf",
    abilityBonuses: { constitution: 2 },
    speed: 25,
    traits: [
      "Darkvision (60 ft)",
      "Dwarven Resilience — advantage on saves vs poison; resistance to poison damage",
      "Stonecunning — double proficiency on History checks related to stonework",
      "Dwarven Combat Training — proficiency with battleaxe, handaxe, light hammer, warhammer",
    ],
    languages: ["Common", "Dwarvish"],
  },
  {
    name: "Halfling",
    abilityBonuses: { dexterity: 2 },
    speed: 25,
    traits: [
      "Lucky — reroll natural 1s on attack rolls, ability checks, and saving throws",
      "Brave — advantage on saves vs frightened",
      "Halfling Nimbleness — move through the space of creatures one size larger",
    ],
    languages: ["Common", "Halfling"],
  },
  {
    name: "Gnome",
    abilityBonuses: { intelligence: 2 },
    speed: 25,
    traits: [
      "Darkvision (60 ft)",
      "Gnome Cunning — advantage on INT, WIS, and CHA saving throws against magic",
    ],
    languages: ["Common", "Gnomish"],
  },
  {
    name: "Half-Elf",
    abilityBonuses: { charisma: 2 }, // +1 to two other abilities chosen at creation
    speed: 30,
    traits: [
      "Darkvision (60 ft)",
      "Fey Ancestry — advantage on saves vs charmed; immune to magical sleep",
      "Skill Versatility — 2 extra skill proficiencies",
    ],
    languages: ["Common", "Elvish", "One extra"],
  },
  {
    name: "Half-Orc",
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    traits: [
      "Darkvision (60 ft)",
      "Menacing — proficiency in Intimidation",
      "Relentless Endurance — drop to 1 HP instead of 0 (once per long rest)",
      "Savage Attacks — extra damage die on critical hits with melee weapons",
    ],
    languages: ["Common", "Orc"],
  },
  {
    name: "Tiefling",
    abilityBonuses: { charisma: 2, intelligence: 1 },
    speed: 30,
    traits: [
      "Darkvision (60 ft)",
      "Hellish Resistance — resistance to fire damage",
      "Infernal Legacy — know Thaumaturgy cantrip",
    ],
    languages: ["Common", "Infernal"],
  },
  {
    name: "Dragonborn",
    abilityBonuses: { strength: 2, charisma: 1 },
    speed: 30,
    traits: [
      "Breath Weapon — 2d6 damage in a 15 ft cone/30 ft line (scales with level); 1/short rest",
      "Damage Resistance — resistance to the damage type of your draconic ancestry",
    ],
    languages: ["Common", "Draconic"],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. CLASSES — PHB Chapters 3-14
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ClassDef {
  name: string;
  hitDie: number;
  primaryAbility: Ability;
  savingThrows: [Ability, Ability];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  skillChoiceCount: number;
  skillChoices: string[];
  features: string[];
  /** Spellcasting ability (undefined for non-casters) */
  spellcastingAbility?: Ability;
  casterType?: "full" | "half" | "pact";
  cantripsKnown: number;
  spellsKnown: number; // 0 for prepared casters (Cleric/Druid/Wizard calculate from ability + level)
  startingEquipment: string[];
  startingGold: number;
}

export const CLASSES: ClassDef[] = [
  {
    name: "Barbarian",
    hitDie: 12,
    primaryAbility: "strength",
    savingThrows: ["strength", "constitution"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    skillChoiceCount: 2,
    skillChoices: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
    features: [
      "Rage — 2/long rest (+2 melee damage, resistance to bludgeoning/piercing/slashing, advantage on STR checks/saves)",
      "Unarmored Defense — AC = 10 + DEX mod + CON mod (no armor)",
    ],
    cantripsKnown: 0, spellsKnown: 0,
    startingEquipment: ["Greataxe", "Handaxe", "Explorer's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
  {
    name: "Bard",
    hitDie: 8,
    primaryAbility: "charisma",
    savingThrows: ["dexterity", "charisma"],
    armorProficiencies: ["Light armor"],
    weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
    skillChoiceCount: 3,
    skillChoices: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
    features: [
      "Bardic Inspiration — d6, CHA mod uses/long rest (short rest at L5+)",
      "Spellcasting (CHA) — full caster",
    ],
    spellcastingAbility: "charisma", casterType: "full",
    cantripsKnown: 2, spellsKnown: 4,
    startingEquipment: ["Rapier", "Lute", "Leather Armor", "Diplomat's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 15,
  },
  {
    name: "Cleric",
    hitDie: 8,
    primaryAbility: "wisdom",
    savingThrows: ["wisdom", "charisma"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons"],
    skillChoiceCount: 2,
    skillChoices: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    features: [
      "Spellcasting (WIS) — full caster, prepare WIS mod + level spells",
      "Divine Domain — Life (bonus proficiency with heavy armor, Disciple of Life: +2+spell level healing)",
    ],
    spellcastingAbility: "wisdom", casterType: "full",
    cantripsKnown: 3, spellsKnown: 0, // prepared caster
    startingEquipment: ["Mace", "Shield", "Scale Mail", "Priest's Pack", "Holy Symbol", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 15,
  },
  {
    name: "Druid",
    hitDie: 8,
    primaryAbility: "wisdom",
    savingThrows: ["intelligence", "wisdom"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields (nonmetal)"],
    weaponProficiencies: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
    features: [
      "Druidic — secret language known only to druids",
      "Spellcasting (WIS) — full caster, prepare WIS mod + level spells",
      "Wild Shape — 2/short rest (L2+), transform into beasts",
    ],
    spellcastingAbility: "wisdom", casterType: "full",
    cantripsKnown: 2, spellsKnown: 0, // prepared caster
    startingEquipment: ["Wooden Shield", "Scimitar", "Leather Armor", "Explorer's Pack", "Druidic Focus", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
  {
    name: "Fighter",
    hitDie: 10,
    primaryAbility: "strength",
    savingThrows: ["strength", "constitution"],
    armorProficiencies: ["All armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    skillChoiceCount: 2,
    skillChoices: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
    features: [
      "Fighting Style — choose one: Archery (+2 ranged attack), Defense (+1 AC), Dueling (+2 one-handed damage), Great Weapon Fighting (reroll 1-2 damage), Protection, Two-Weapon Fighting",
      "Second Wind — 1/short rest, heal 1d10 + level HP as bonus action",
    ],
    cantripsKnown: 0, spellsKnown: 0,
    startingEquipment: ["Longsword", "Shield", "Chain Mail", "Dungeoneer's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 15,
  },
  {
    name: "Monk",
    hitDie: 8,
    primaryAbility: "dexterity",
    savingThrows: ["strength", "dexterity"],
    armorProficiencies: [],
    weaponProficiencies: ["Simple weapons", "Shortswords"],
    skillChoiceCount: 2,
    skillChoices: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
    features: [
      "Unarmored Defense — AC = 10 + DEX mod + WIS mod (no armor, no shield)",
      "Martial Arts — use DEX for unarmed/monk weapons; unarmed strike deals 1d4; bonus action unarmed strike after Attack action",
      "Ki — level points/short rest (L2+): Flurry of Blows (2 bonus unarmed), Patient Defense (Dodge), Step of the Wind (Dash/Disengage)",
    ],
    cantripsKnown: 0, spellsKnown: 0,
    startingEquipment: ["Shortsword", "Dungeoneer's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 5,
  },
  {
    name: "Paladin",
    hitDie: 10,
    primaryAbility: "strength",
    savingThrows: ["wisdom", "charisma"],
    armorProficiencies: ["All armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    skillChoiceCount: 2,
    skillChoices: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
    features: [
      "Divine Sense — detect celestials, fiends, undead within 60 ft (1 + CHA mod uses/long rest)",
      "Lay on Hands — heal pool of 5 × level HP/long rest",
      "Spellcasting (CHA) — half caster (L2+), prepare CHA mod + half-level spells",
      "Fighting Style (L2) — Defense, Dueling, Great Weapon Fighting, Protection",
      "Divine Smite (L2) — expend spell slot for +2d8 radiant damage (+1d8 per slot above 1st, +1d8 vs undead/fiend)",
    ],
    spellcastingAbility: "charisma", casterType: "half",
    cantripsKnown: 0, spellsKnown: 0, // prepared caster, starts spells at L2
    startingEquipment: ["Longsword", "Shield", "Chain Mail", "Priest's Pack", "Holy Symbol", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 15,
  },
  {
    name: "Ranger",
    hitDie: 10,
    primaryAbility: "dexterity",
    savingThrows: ["strength", "dexterity"],
    armorProficiencies: ["Light armor", "Medium armor", "Shields"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    skillChoiceCount: 3,
    skillChoices: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
    features: [
      "Favored Enemy — advantage on Survival checks to track and INT checks to recall info",
      "Natural Explorer — difficult terrain doesn't slow, advantage on initiative, extra benefits in favored terrain",
      "Spellcasting (WIS) — half caster (L2+)",
    ],
    spellcastingAbility: "wisdom", casterType: "half",
    cantripsKnown: 0, spellsKnown: 0, // half caster, starts spells at L2
    startingEquipment: ["Longbow", "Quiver", "Shortsword", "Leather Armor", "Explorer's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
  {
    name: "Rogue",
    hitDie: 8,
    primaryAbility: "dexterity",
    savingThrows: ["dexterity", "intelligence"],
    armorProficiencies: ["Light armor"],
    weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
    skillChoiceCount: 4,
    skillChoices: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
    features: [
      "Expertise — double proficiency on 2 chosen skills",
      "Sneak Attack — 1d6 extra damage (scales: +1d6 every 2 levels) on finesse/ranged attacks with advantage or adjacent ally",
      "Thieves' Cant — secret language/cipher among rogues",
    ],
    cantripsKnown: 0, spellsKnown: 0,
    startingEquipment: ["Shortsword", "Shortbow", "Quiver", "Leather Armor", "Burglar's Pack", "Thieves' Tools", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
  {
    name: "Sorcerer",
    hitDie: 6,
    primaryAbility: "charisma",
    savingThrows: ["constitution", "charisma"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
    features: [
      "Spellcasting (CHA) — full caster",
      "Sorcerous Origin — Draconic Bloodline (+1 HP/level, AC 13 + DEX when unarmored)",
      "Sorcery Points (L2+) — level points/long rest for Metamagic",
    ],
    spellcastingAbility: "charisma", casterType: "full",
    cantripsKnown: 4, spellsKnown: 2,
    startingEquipment: ["Dagger", "Arcane Focus", "Dungeoneer's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
  {
    name: "Warlock",
    hitDie: 8,
    primaryAbility: "charisma",
    savingThrows: ["wisdom", "charisma"],
    armorProficiencies: ["Light armor"],
    weaponProficiencies: ["Simple weapons"],
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
    features: [
      "Otherworldly Patron — The Fiend (Dark One's Blessing: temp HP on kill = CHA mod + level)",
      "Pact Magic (CHA) — slots recharge on short rest; all slots are highest available level",
    ],
    spellcastingAbility: "charisma", casterType: "pact",
    cantripsKnown: 2, spellsKnown: 2,
    startingEquipment: ["Dagger", "Arcane Focus", "Scholar's Pack", "Leather Armor", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
  {
    name: "Wizard",
    hitDie: 6,
    primaryAbility: "intelligence",
    savingThrows: ["intelligence", "wisdom"],
    armorProficiencies: [],
    weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
    skillChoiceCount: 2,
    skillChoices: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
    features: [
      "Spellcasting (INT) — full caster, prepare INT mod + level spells from spellbook",
      "Arcane Recovery — 1/long rest, recover spell slot levels = ceil(level/2) on short rest",
    ],
    spellcastingAbility: "intelligence", casterType: "full",
    cantripsKnown: 3, spellsKnown: 6, // 6 spells in starting spellbook
    startingEquipment: ["Quarterstaff", "Spellbook", "Arcane Focus", "Scholar's Pack", "Backpack", "Waterskin", "Rations", "Torch"],
    startingGold: 10,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. SPELL SLOT TABLES — PHB p.201, p.83, p.106
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Full caster slots: index 0 = 1st-level slots, etc. */
export const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [2],          2:  [3],          3:  [4, 2],       4:  [4, 3],
  5:  [4, 3, 2],    6:  [4, 3, 3],    7:  [4, 3, 3, 1], 8:  [4, 3, 3, 2],
  9:  [4, 3, 3, 3, 1],                 10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],              12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],           14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],        16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],     18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],     20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/** Half caster slots (Paladin, Ranger): start at level 2 */
export const HALF_CASTER_SLOTS: Record<number, number[]> = {
  2:  [2],       3:  [3],       4:  [3],       5:  [4, 2],    6:  [4, 2],
  7:  [4, 3],    8:  [4, 3],    9:  [4, 3, 2], 10: [4, 3, 2],
  11: [4, 3, 3], 12: [4, 3, 3], 13: [4, 3, 3, 1], 14: [4, 3, 3, 1],
  15: [4, 3, 3, 2], 16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2],
};

/** Warlock pact magic: count = number of slots, level = spell level of those slots */
export const WARLOCK_PACT_SLOTS: Record<number, { count: number; level: number }> = {
  1: { count: 1, level: 1 },  2: { count: 2, level: 1 },
  3: { count: 2, level: 2 },  4: { count: 2, level: 2 },
  5: { count: 2, level: 3 },  6: { count: 2, level: 3 },
  7: { count: 2, level: 4 },  8: { count: 2, level: 4 },
  9: { count: 2, level: 5 },  10: { count: 2, level: 5 },
  11: { count: 3, level: 5 }, 12: { count: 3, level: 5 },
  13: { count: 3, level: 5 }, 14: { count: 3, level: 5 },
  15: { count: 3, level: 5 }, 16: { count: 3, level: 5 },
  17: { count: 4, level: 5 }, 18: { count: 4, level: 5 },
  19: { count: 4, level: 5 }, 20: { count: 4, level: 5 },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. SPELLS — Cantrips & 1st-Level
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SpellDef {
  name: string;
  level: number; // 0 = cantrip
  school: string;
  damageDice?: { count: number; sides: number }; // undefined = no damage / utility
  damageScaling?: "cantrip"; // cantrips scale at L5/11/17
  damageBonus?: number;
  healing?: { dice: number; sides: number; bonus?: "spellMod" | number };
  autoHit?: boolean;
  saveDC?: boolean; // target makes a save instead of caster rolling attack
  classes: string[];
}

export const SPELLS: SpellDef[] = [
  // ── Damage cantrips ──
  { name: "Fire Bolt",        level: 0, school: "Evocation",     damageDice: { count: 1, sides: 10 }, damageScaling: "cantrip", classes: ["Sorcerer", "Wizard"] },
  { name: "Eldritch Blast",   level: 0, school: "Evocation",     damageDice: { count: 1, sides: 10 }, damageScaling: "cantrip", classes: ["Warlock"] },
  { name: "Sacred Flame",     level: 0, school: "Evocation",     damageDice: { count: 1, sides: 8 },  damageScaling: "cantrip", saveDC: true, classes: ["Cleric"] },
  { name: "Chill Touch",      level: 0, school: "Necromancy",    damageDice: { count: 1, sides: 8 },  damageScaling: "cantrip", classes: ["Sorcerer", "Warlock", "Wizard"] },
  { name: "Ray of Frost",     level: 0, school: "Evocation",     damageDice: { count: 1, sides: 8 },  damageScaling: "cantrip", classes: ["Sorcerer", "Wizard"] },
  { name: "Shocking Grasp",   level: 0, school: "Evocation",     damageDice: { count: 1, sides: 8 },  damageScaling: "cantrip", classes: ["Sorcerer", "Wizard"] },
  { name: "Acid Splash",      level: 0, school: "Conjuration",   damageDice: { count: 1, sides: 6 },  damageScaling: "cantrip", saveDC: true, classes: ["Sorcerer", "Wizard"] },
  { name: "Poison Spray",     level: 0, school: "Conjuration",   damageDice: { count: 1, sides: 12 }, damageScaling: "cantrip", saveDC: true, classes: ["Druid", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Vicious Mockery",  level: 0, school: "Enchantment",   damageDice: { count: 1, sides: 4 },  damageScaling: "cantrip", saveDC: true, classes: ["Bard"] },
  { name: "Thorn Whip",       level: 0, school: "Transmutation", damageDice: { count: 1, sides: 6 },  damageScaling: "cantrip", classes: ["Druid"] },
  { name: "Produce Flame",    level: 0, school: "Conjuration",   damageDice: { count: 1, sides: 8 },  damageScaling: "cantrip", classes: ["Druid"] },
  { name: "Shillelagh",       level: 0, school: "Transmutation", damageDice: { count: 1, sides: 8 },  classes: ["Druid"] }, // does not scale

  // ── Utility cantrips (no damage) ──
  { name: "Blade Ward",       level: 0, school: "Abjuration",    classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Dancing Lights",   level: 0, school: "Evocation",     classes: ["Bard", "Sorcerer", "Wizard"] },
  { name: "Friends",          level: 0, school: "Enchantment",   classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Guidance",         level: 0, school: "Divination",    classes: ["Cleric", "Druid"] },
  { name: "Light",            level: 0, school: "Evocation",     classes: ["Bard", "Cleric", "Sorcerer", "Wizard"] },
  { name: "Mage Hand",        level: 0, school: "Conjuration",   classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Mending",          level: 0, school: "Transmutation", classes: ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"] },
  { name: "Message",          level: 0, school: "Transmutation", classes: ["Bard", "Sorcerer", "Wizard"] },
  { name: "Minor Illusion",   level: 0, school: "Illusion",      classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Prestidigitation", level: 0, school: "Transmutation", classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Resistance",       level: 0, school: "Abjuration",    classes: ["Cleric", "Druid"] },
  { name: "Spare the Dying",  level: 0, school: "Necromancy",    classes: ["Cleric"] },
  { name: "Thaumaturgy",      level: 0, school: "Transmutation", classes: ["Cleric"] },
  { name: "True Strike",      level: 0, school: "Divination",    classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Druidcraft",       level: 0, school: "Transmutation", classes: ["Druid"] },

  // ── 1st-level damage spells ──
  { name: "Magic Missile",    level: 1, school: "Evocation",     damageDice: { count: 3, sides: 4 }, damageBonus: 3, autoHit: true, classes: ["Sorcerer", "Wizard"] },
  { name: "Burning Hands",    level: 1, school: "Evocation",     damageDice: { count: 3, sides: 6 }, saveDC: true, classes: ["Sorcerer", "Wizard"] },
  { name: "Thunderwave",      level: 1, school: "Evocation",     damageDice: { count: 2, sides: 8 }, saveDC: true, classes: ["Bard", "Druid", "Sorcerer", "Wizard"] },
  { name: "Chromatic Orb",    level: 1, school: "Evocation",     damageDice: { count: 3, sides: 8 }, classes: ["Sorcerer", "Wizard"] },
  { name: "Witch Bolt",       level: 1, school: "Evocation",     damageDice: { count: 1, sides: 12 }, classes: ["Sorcerer", "Warlock", "Wizard"] },
  { name: "Guiding Bolt",     level: 1, school: "Evocation",     damageDice: { count: 4, sides: 6 }, classes: ["Cleric"] },
  { name: "Inflict Wounds",   level: 1, school: "Necromancy",    damageDice: { count: 3, sides: 10 }, classes: ["Cleric"] },
  { name: "Ray of Sickness",  level: 1, school: "Necromancy",    damageDice: { count: 2, sides: 8 }, classes: ["Sorcerer", "Wizard"] },
  { name: "Hellish Rebuke",   level: 1, school: "Evocation",     damageDice: { count: 2, sides: 10 }, saveDC: true, classes: ["Warlock"] },

  // ── 1st-level healing spells ──
  { name: "Cure Wounds",      level: 1, school: "Evocation",     healing: { dice: 1, sides: 8, bonus: "spellMod" }, classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger"] },
  { name: "Healing Word",     level: 1, school: "Evocation",     healing: { dice: 1, sides: 4, bonus: "spellMod" }, classes: ["Bard", "Cleric", "Druid"] },
  { name: "Goodberry",        level: 1, school: "Transmutation", healing: { dice: 0, sides: 0, bonus: 10 }, classes: ["Druid", "Ranger"] },

  // ── 1st-level utility spells ──
  { name: "Bless",            level: 1, school: "Enchantment",   classes: ["Cleric", "Paladin"] },
  { name: "Shield",           level: 1, school: "Abjuration",    classes: ["Sorcerer", "Wizard"] },
  { name: "Mage Armor",       level: 1, school: "Abjuration",    classes: ["Sorcerer", "Wizard"] },
  { name: "Detect Magic",     level: 1, school: "Divination",    classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Wizard"] },
  { name: "Sleep",            level: 1, school: "Enchantment",   classes: ["Bard", "Sorcerer", "Wizard"] },
  { name: "Charm Person",     level: 1, school: "Enchantment",   classes: ["Bard", "Druid", "Sorcerer", "Warlock", "Wizard"] },
  { name: "Faerie Fire",      level: 1, school: "Evocation",     classes: ["Bard", "Druid"] },
  { name: "Entangle",         level: 1, school: "Conjuration",   classes: ["Druid"] },
  { name: "Hex",              level: 1, school: "Enchantment",   classes: ["Warlock"] },
  { name: "Heroism",          level: 1, school: "Enchantment",   classes: ["Bard", "Paladin"] },
  { name: "Identify",         level: 1, school: "Divination",    classes: ["Bard", "Wizard"] },
  { name: "Find Familiar",    level: 1, school: "Conjuration",   classes: ["Wizard"] },
];

/** Cantrip damage scaling: dice multiplier by character level */
export function cantripScale(level: number): number {
  return level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. ARMOR — PHB p.144-145
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ArmorDef {
  name: string;
  category: "light" | "medium" | "heavy" | "shield";
  baseAC: number;
  /** Max DEX bonus applied (undefined = unlimited for light, 2 for medium, 0 for heavy) */
  maxDexBonus?: number;
  /** Minimum STR to wear without penalty */
  strRequired?: number;
  price: number;
}

export const ARMOR: ArmorDef[] = [
  // Light (full DEX bonus)
  { name: "Padded Armor",     category: "light",  baseAC: 11, price: 5 },
  { name: "Leather Armor",    category: "light",  baseAC: 11, price: 10 },
  { name: "Studded Leather",  category: "light",  baseAC: 12, price: 45 },
  // Medium (max +2 DEX)
  { name: "Hide Armor",       category: "medium", baseAC: 12, maxDexBonus: 2, price: 10 },
  { name: "Chain Shirt",      category: "medium", baseAC: 13, maxDexBonus: 2, price: 50 },
  { name: "Scale Mail",       category: "medium", baseAC: 14, maxDexBonus: 2, price: 50 },
  { name: "Breastplate",      category: "medium", baseAC: 14, maxDexBonus: 2, price: 400 },
  { name: "Half Plate",       category: "medium", baseAC: 15, maxDexBonus: 2, price: 750 },
  // Heavy (no DEX bonus)
  { name: "Ring Mail",        category: "heavy",  baseAC: 14, maxDexBonus: 0, price: 30 },
  { name: "Chain Mail",       category: "heavy",  baseAC: 16, maxDexBonus: 0, strRequired: 13, price: 75 },
  { name: "Splint Armor",     category: "heavy",  baseAC: 17, maxDexBonus: 0, strRequired: 15, price: 200 },
  { name: "Plate Armor",      category: "heavy",  baseAC: 18, maxDexBonus: 0, strRequired: 15, price: 1500 },
  // Shield
  { name: "Shield",           category: "shield", baseAC: 2, price: 10 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. WEAPONS — PHB p.146-149
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WeaponDef {
  name: string;
  category: "simple" | "martial";
  damageDice: number;
  damageSides: number;
  damageType: "slashing" | "piercing" | "bludgeoning";
  properties: string[];
  price: number;
  twoHanded?: boolean;
}

export const WEAPONS: WeaponDef[] = [
  // Simple melee
  { name: "Dagger",       category: "simple",  damageDice: 1, damageSides: 4,  damageType: "piercing",    properties: ["Finesse", "Light", "Thrown (20/60)"], price: 2 },
  { name: "Handaxe",      category: "simple",  damageDice: 1, damageSides: 6,  damageType: "slashing",    properties: ["Light", "Thrown (20/60)"], price: 5 },
  { name: "Javelin",      category: "simple",  damageDice: 1, damageSides: 6,  damageType: "piercing",    properties: ["Thrown (30/120)"], price: 1 },
  { name: "Mace",         category: "simple",  damageDice: 1, damageSides: 6,  damageType: "bludgeoning", properties: [], price: 5 },
  { name: "Quarterstaff", category: "simple",  damageDice: 1, damageSides: 6,  damageType: "bludgeoning", properties: ["Versatile (1d8)"], price: 1 },
  { name: "Spear",        category: "simple",  damageDice: 1, damageSides: 6,  damageType: "piercing",    properties: ["Thrown (20/60)", "Versatile (1d8)"], price: 1 },
  // Simple ranged
  { name: "Shortbow",     category: "simple",  damageDice: 1, damageSides: 6,  damageType: "piercing",    properties: ["Ammunition (80/320)"], price: 25, twoHanded: true },
  { name: "Crossbow",     category: "simple",  damageDice: 1, damageSides: 8,  damageType: "piercing",    properties: ["Ammunition (80/320)", "Loading"], price: 25, twoHanded: true },
  // Martial melee
  { name: "Battleaxe",    category: "martial", damageDice: 1, damageSides: 8,  damageType: "slashing",    properties: ["Versatile (1d10)"], price: 10 },
  { name: "Flail",        category: "martial", damageDice: 1, damageSides: 8,  damageType: "bludgeoning", properties: [], price: 10 },
  { name: "Glaive",       category: "martial", damageDice: 1, damageSides: 10, damageType: "slashing",    properties: ["Heavy", "Reach"], price: 20, twoHanded: true },
  { name: "Greataxe",     category: "martial", damageDice: 1, damageSides: 12, damageType: "slashing",    properties: ["Heavy"], price: 30, twoHanded: true },
  { name: "Greatsword",   category: "martial", damageDice: 2, damageSides: 6,  damageType: "slashing",    properties: ["Heavy"], price: 50, twoHanded: true },
  { name: "Halberd",      category: "martial", damageDice: 1, damageSides: 10, damageType: "slashing",    properties: ["Heavy", "Reach"], price: 20, twoHanded: true },
  { name: "Lance",        category: "martial", damageDice: 1, damageSides: 12, damageType: "piercing",    properties: ["Reach", "Special"], price: 10 },
  { name: "Longsword",    category: "martial", damageDice: 1, damageSides: 8,  damageType: "slashing",    properties: ["Versatile (1d10)"], price: 15 },
  { name: "Maul",         category: "martial", damageDice: 2, damageSides: 6,  damageType: "bludgeoning", properties: ["Heavy"], price: 10, twoHanded: true },
  { name: "Morningstar",  category: "martial", damageDice: 1, damageSides: 8,  damageType: "piercing",    properties: [], price: 15 },
  { name: "Pike",         category: "martial", damageDice: 1, damageSides: 10, damageType: "piercing",    properties: ["Heavy", "Reach"], price: 5, twoHanded: true },
  { name: "Rapier",       category: "martial", damageDice: 1, damageSides: 8,  damageType: "piercing",    properties: ["Finesse"], price: 25 },
  { name: "Scimitar",     category: "martial", damageDice: 1, damageSides: 6,  damageType: "slashing",    properties: ["Finesse", "Light"], price: 25 },
  { name: "Shortsword",   category: "martial", damageDice: 1, damageSides: 6,  damageType: "piercing",    properties: ["Finesse", "Light"], price: 10 },
  { name: "Trident",      category: "martial", damageDice: 1, damageSides: 6,  damageType: "piercing",    properties: ["Thrown (20/60)", "Versatile (1d8)"], price: 5 },
  { name: "Warhammer",    category: "martial", damageDice: 1, damageSides: 8,  damageType: "bludgeoning", properties: ["Versatile (1d10)"], price: 15 },
  { name: "Whip",         category: "martial", damageDice: 1, damageSides: 4,  damageType: "slashing",    properties: ["Finesse", "Reach"], price: 2 },
  // Martial ranged
  { name: "Longbow",      category: "martial", damageDice: 1, damageSides: 8,  damageType: "piercing",    properties: ["Ammunition (150/600)", "Heavy"], price: 50, twoHanded: true },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. COMBAT RULES SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * COMBAT RESOLUTION (how the engine works):
 *
 * Attack Roll:  d20 + ability mod + proficiency bonus ≥ enemy AC → hit
 *   - Melee:  STR mod (or DEX for finesse weapons)
 *   - Ranged: DEX mod
 *   - Spell:  spellcasting ability mod
 *   - Natural 20 → always hits (critical: double damage dice)
 *   - Natural 1  → always misses
 *
 * Damage Roll:  weapon dice + ability mod
 *   - Melee:  + STR mod (or DEX for finesse)
 *   - Ranged: + DEX mod
 *   - Spell:  dice only (no ability mod for most damage spells)
 *   - Minimum damage is always 1
 *
 * AC Calculation:
 *   - Light armor:  base AC + full DEX mod
 *   - Medium armor: base AC + DEX mod (max +2)
 *   - Heavy armor:  base AC (no DEX)
 *   - Shield:       +2 AC
 *   - Barbarian unarmored: 10 + DEX + CON
 *   - Monk unarmored:      10 + DEX + WIS
 *   - Sorcerer Draconic:   13 + DEX (no armor)
 *
 * Skill Checks:  d20 + ability mod + proficiency bonus ≥ DC
 *   - Skill → ability mapping defined in SKILLS table above
 *
 * Saving Throws:  d20 + ability mod + proficiency bonus (if proficient) ≥ DC
 *
 * Death Saving Throws (at 0 HP):
 *   - DC 10, no modifiers
 *   - Nat 20 → regain 1 HP
 *   - Nat 1  → counts as 2 failures
 *   - 3 successes → stabilize
 *   - 3 failures → death
 *
 * Enemy Scaling (game-specific):
 *   - AC:           10 + proficiency bonus
 *   - Attack bonus: proficiency bonus + 1
 *   - Damage:       1d6 + floor(level/4)
 *
 * DC Scaling (game-specific):
 *   - Scaled DC = base DC + floor(proficiency bonus / 2)
 *   - Skill check base DC: 12 (Medium)
 *   - Exploration base DC:  10 (Easy-Medium)
 *   - Social base DC:       11
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. CAMPAIGN THEMES (20 themes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CAMPAIGN_THEMES = [
  { id: "dungeon_crawl",     label: "Dungeon Crawl",          levels: "1-20" },
  { id: "wilderness_hex",    label: "Wilderness Exploration", levels: "1-20" },
  { id: "urban_intrigue",    label: "Urban Intrigue",         levels: "1-20" },
  { id: "horror",            label: "Horror",                 levels: "1-20" },
  { id: "war_military",      label: "War & Military",         levels: "3-20" },
  { id: "planar",            label: "Planar Adventures",      levels: "5-20" },
  { id: "political",         label: "Political Intrigue",     levels: "1-20" },
  { id: "mystery",           label: "Mystery & Investigation", levels: "1-20" },
  { id: "heist",             label: "Heist",                  levels: "1-20" },
  { id: "survival",          label: "Survival",               levels: "1-20" },
  { id: "epic_worldsaving",  label: "Epic World-Saving",      levels: "5-20" },
  { id: "seafaring",         label: "Seafaring & Naval",      levels: "3-20" },
  { id: "underdark",         label: "Underdark",              levels: "3-20" },
  { id: "dragon_focused",    label: "Dragon-Focused",         levels: "1-20" },
  { id: "undead_necromancy", label: "Undead & Necromancy",    levels: "1-20" },
  { id: "fey_nature",        label: "Fey & Nature",           levels: "1-20" },
  { id: "desert_arabian",    label: "Desert Adventures",      levels: "1-20" },
  { id: "oriental",          label: "Eastern Adventures",     levels: "1-20" },
  { id: "norse_viking",      label: "Norse & Viking",         levels: "1-20" },
  { id: "gothic",            label: "Gothic & Dark",          levels: "1-20" },
] as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 14. RESOURCE POOLS BY CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Class resources and their recharge rules:
 *
 * ┌─────────────┬──────────────────┬───────────────────────┬───────────┐
 * │ Class       │ Resource         │ Uses                  │ Recharges │
 * ├─────────────┼──────────────────┼───────────────────────┼───────────┤
 * │ Barbarian   │ Rage             │ 2(L1), 3(L3), 4(L6), │ Long      │
 * │             │                  │ 5(L12), 6(L17), ∞(20) │           │
 * │ Bard        │ Bardic Insp.     │ CHA mod (min 1)       │ Long/Short│
 * │             │                  │                       │ (L5+)     │
 * │ Cleric      │ Channel Divinity │ 1(L2), 2(L6), 3(L18) │ Short     │
 * │ Druid       │ Wild Shape       │ 2                     │ Short     │
 * │ Fighter     │ Second Wind      │ 1                     │ Short     │
 * │ Monk        │ Ki Points        │ = level               │ Short     │
 * │ Paladin     │ Channel Divinity │ 1                     │ Short     │
 * │ Paladin     │ Lay on Hands     │ 5 × level HP          │ Long      │
 * │ Ranger      │ Favored Enemy    │ 1                     │ Long      │
 * │ Sorcerer    │ Sorcery Points   │ = level (L2+)         │ Long      │
 * │ Warlock     │ Pact Slots       │ 1-4 (see table)       │ Short     │
 * │ Wizard      │ Arcane Recovery  │ 1                     │ Long      │
 * │ Dragonborn  │ Breath Weapon    │ 1                     │ Short     │
 * │ All         │ Hit Dice         │ = level               │ Long½     │
 * └─────────────┴──────────────────┴───────────────────────┴───────────┘
 *
 * Rest rules:
 * - Short rest: recharges "short" resources. Hit dice are SPENT, not recharged.
 * - Long rest:  recharges everything. Hit dice regain floor(max/2), min 1.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 15. FIGHTING STYLES — PHB p.72, p.91, p.91
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FIGHTING_STYLES = {
  "Archery":              "+2 bonus to attack rolls with ranged weapons",
  "Defense":              "+1 AC while wearing armor",
  "Dueling":              "+2 damage when wielding a one-handed weapon and no other weapon",
  "Great Weapon Fighting": "Reroll 1s and 2s on damage dice with two-handed/versatile weapons",
  "Protection":           "Impose disadvantage on attack rolls against adjacent ally (requires shield)",
  "Two-Weapon Fighting":  "Add ability modifier to off-hand weapon damage",
} as const;

export const CLASS_FIGHTING_STYLES: Record<string, string[]> = {
  Fighter: ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"],
  Paladin: ["Defense", "Dueling", "Great Weapon Fighting", "Protection"],
  Ranger:  ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 16. HP CALCULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * HP at level 1:  hit die max + CON modifier
 * HP per level:   (hit die / 2 + 1) + CON modifier  (average roll)
 * Sorcerer Draconic Bloodline: +1 HP per level (including level 1)
 *
 * Examples:
 *   Fighter (d10), CON 14 (+2):  L1 = 12, L2 = 19, L3 = 26
 *   Wizard  (d6),  CON 10 (+0):  L1 = 6,  L2 = 10, L3 = 14
 *   Sorcerer(d6),  CON 14 (+2):  L1 = 9,  L2 = 15, L3 = 21  (Draconic +1/lvl)
 */
export function calculateMaxHP(
  hitDie: number,
  conMod: number,
  level: number,
  isDraconicSorcerer: boolean = false
): number {
  const draconicBonus = isDraconicSorcerer ? 1 : 0;
  const firstLevel = hitDie + conMod + draconicBonus;
  const perLevel = Math.floor(hitDie / 2) + 1 + conMod + draconicBonus;
  return firstLevel + perLevel * (level - 1);
}
