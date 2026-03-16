"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { getAlignment, ALIGNMENT_LABELS } from "@/lib/karma";
import type { CharacterClass } from "@/types/character";
import { cn } from "@/lib/utils";
import { KarmaHistory } from "./karma-history";
import { FameHistory } from "./fame-history";
import { getItemInfo, getItemIcon } from "@/lib/items";

interface Props {
  onClose: () => void;
}

// ── Color palette ─────────────────────────────────────────────

const C = {
  bg: "#0a0a0a",
  sectionBg: "#110800",
  statBg: "#1a0a00",
  rowOdd: "#0d0d0d",
  rowEven: "#130800",
  gold: "#c9a227",
  goldMuted: "#a07830",
  goldBorder: "rgba(201,162,39,0.3)",
  goldBorderStrong: "rgba(201,162,39,0.5)",
  crimson: "#8b0000",
  crimsonBorder: "rgba(139,0,0,0.4)",
  parchment: "#e8d5b0",
  parchmentMuted: "rgba(232,213,176,0.6)",
  purple: "#a855f7",
  purpleMuted: "rgba(168,85,247,0.25)",
  tooltipBg: "#1a0a00",
  tooltipBorder: "#c9a227",
};

const headerFont = "'Cinzel', 'Palatino Linotype', 'Book Antiqua', serif";
const bodyFont = "'Georgia', 'Palatino Linotype', serif";

// ── Tooltip data ──────────────────────────────────────────────

const ABILITY_TOOLTIPS: Record<string, string> = {
  STR: "Strength: Melee attacks and damage with non-finesse weapons, Athletics checks, carrying capacity, and breaking objects.",
  DEX: "Dexterity: Ranged attacks, finesse weapon attacks, AC with light armor, Stealth, Acrobatics, and Sleight of Hand.",
  CON: "Constitution: Maximum HP, concentration saves when hit, and CON saving throws.",
  INT: "Intelligence: Arcana, History, Investigation, Nature, Religion. Spellcasting for Wizards.",
  WIS: "Wisdom: Insight, Medicine, Perception, Survival, Animal Handling. Spellcasting for Clerics and Druids.",
  CHA: "Charisma: Deception, Intimidation, Performance, Persuasion. Spellcasting for Bards, Paladins, Sorcerers, Warlocks.",
};

const SAVE_TOOLTIPS: Record<string, string> = {
  STR: "Resisting being physically moved, restrained, or knocked prone by force.",
  DEX: "Dodging area effects like Fireball, breath weapons, and traps.",
  CON: "Resisting poison, disease, exhaustion, and maintaining concentration spells when hit.",
  INT: "Resisting mind-affecting magic and illusions.",
  WIS: "Resisting charms, fear, and compulsion effects.",
  CHA: "Resisting effects that alter your personality or sense of self.",
};

const SKILL_TOOLTIPS: Record<string, string> = {
  Acrobatics: "Balancing, tumbling, and escaping grapples through agility.",
  "Animal Handling": "Calming, controlling, or reading the intentions of animals.",
  Arcana: "Recalling lore about spells, magic items, planes, and arcane traditions.",
  Athletics: "Climbing, swimming, jumping, and feats of physical strength.",
  Deception: "Misleading others through lies, misdirection, or disguise.",
  History: "Recalling lore about historical events, legends, and past civilizations.",
  Insight: "Reading a creature's true intentions or detecting lies.",
  Intimidation: "Influencing through threats, hostile actions, or shows of force.",
  Investigation: "Searching for clues, deducing information, and examining objects carefully.",
  Medicine: "Stabilizing the dying, diagnosing illness, and treating wounds.",
  Nature: "Recalling lore about terrain, plants, animals, and weather.",
  Perception: "Spotting, hearing, or otherwise sensing the presence of something.",
  Performance: "Entertaining an audience through music, dance, acting, or storytelling.",
  Persuasion: "Influencing others through tact, diplomacy, and reasoned argument.",
  Religion: "Recalling lore about deities, religious rites, and holy symbols.",
  "Sleight of Hand": "Picking pockets, palming objects, and performing manual trickery.",
  Stealth: "Moving silently and hiding from enemies.",
  Survival: "Tracking, navigating wilderness, foraging, and avoiding natural hazards.",
};

const DAMAGE_TYPE_TOOLTIPS: Record<string, string> = {
  piercing: "Piercing damage from sharp points. Effective against most creatures.",
  slashing: "Slashing from bladed edges. Some creatures resist it.",
  bludgeoning: "Blunt force. Skeletons are vulnerable to bludgeoning damage.",
};

const TRAIT_TOOLTIPS: Record<string, string> = {
  // ── Racial Traits ──────────────────────────────────────────────
  "Darkvision (60 ft)": "See in dim light as bright light, and darkness as dim light, within 60 feet.",
  Darkvision: "See in dim light as bright light, and darkness as dim light, within 60 feet.",
  "Fey Ancestry": "Advantage on saving throws against being charmed. Magic can't put you to sleep.",
  Trance: "Elves don't sleep. You meditate for 4 hours instead of sleeping 8, and remain semiconscious.",
  "Elf Weapon Training": "Proficiency with longswords, shortswords, shortbows, and longbows.",
  "Fleet of Foot": "Your base walking speed is 35 feet instead of 30.",
  "Mask of the Wild": "You can attempt to hide even when only lightly obscured by foliage, rain, snow, mist, or other natural phenomena.",
  "Dwarven Resilience": "Advantage on saving throws against poison, and resistance to poison damage.",
  "Dwarven Combat Training": "Proficiency with battleaxes, handaxes, light hammers, and warhammers.",
  "Dwarven Toughness": "Your hit point maximum increases by 1 per level.",
  Stonecunning: "When making Intelligence (History) checks related to stonework, add double your proficiency bonus.",
  Lucky: "When you roll a 1 on a d20 for an attack, ability check, or saving throw, you can reroll and must use the new roll.",
  Brave: "Advantage on saving throws against being frightened.",
  "Halfling Nimbleness": "You can move through the space of any creature that is one size larger than you.",
  "Gnome Cunning": "Advantage on INT, WIS, and CHA saving throws against magic.",
  "Artificer's Lore": "When making Intelligence (History) checks related to magic items, alchemical objects, or technological devices, add double your proficiency bonus.",
  "Speak with Small Beasts": "You can communicate simple ideas with Small or smaller beasts through sounds and gestures.",
  "Natural Illusionist": "You know the Minor Illusion cantrip. Intelligence is your spellcasting ability for it.",
  "Skill Versatility": "You gain proficiency in two skills of your choice.",
  Skilled: "You gain proficiency in two skills of your choice.",
  Versatile: "Humans gain one extra skill proficiency and one extra language of their choice.",
  "Extra Language": "Humans learn one additional language of their choice.",
  "Relentless Endurance": "When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest.",
  Menacing: "You gain proficiency in the Intimidation skill.",
  "Savage Attacks": "On a critical hit with a melee weapon, roll one extra damage die and add it to the total.",
  "Dragon Ancestor": "You have draconic ancestry that grants you a breath weapon and damage resistance. Choose a dragon type at creation.",
  "Breath Weapon": "Use an action to exhale destructive energy in a line or cone. Damage type and area depend on your draconic ancestry. DC 8 + CON mod + proficiency. Recharges on short or long rest.",
  "Damage Resistance": "You have resistance to the damage type associated with your draconic ancestry.",
  "Infernal Legacy": "You know the Thaumaturgy cantrip. At level 3 gain Hellish Rebuke (1/day). At level 5 gain Darkness (1/day).",
  "Hellish Resistance": "Resistance to fire damage — all fire damage you take is halved.",
  // ── Class Features ─────────────────────────────────────────────
  // Barbarian
  Rage: "Bonus action. Advantage on STR checks and saves, bonus rage damage on STR melee attacks, resistance to bludgeoning/piercing/slashing. Lasts 1 minute; ends early if you haven't attacked or taken damage since your last turn.",
  "Unarmored Defense": "Without armor, your AC equals 10 + DEX modifier + CON modifier (Barbarian) or 10 + DEX modifier + WIS modifier (Monk). You can use a shield and still gain this benefit.",
  "Reckless Attack": "On your first attack each turn, you can choose to attack recklessly. You gain advantage on all STR melee attacks this turn, but attacks against you have advantage until your next turn.",
  "Danger Sense": "You have advantage on DEX saving throws against effects you can see, such as traps and spells, as long as you aren't blinded, deafened, or incapacitated.",
  // Bard
  "Bardic Inspiration": "Bonus action. Give one creature within 60 ft a d6 inspiration die (scales with level). They can add it to one ability check, attack roll, or saving throw within 10 minutes. Uses equal to CHA modifier per short/long rest.",
  "Jack of All Trades": "Add half your proficiency bonus (rounded down) to any ability check that doesn't already include your proficiency bonus.",
  "Song of Rest": "During a short rest, you and allies who hear your performance regain extra HP when spending Hit Dice: an extra 1d6 (scales at higher levels).",
  Expertise: "Choose two skill proficiencies (or one skill and thieves' tools). Your proficiency bonus is doubled for any check you make with them. You gain two more at level 6.",
  "Countercharm": "As an action, you perform for 1 round. Allies within 30 ft have advantage on saves against being frightened or charmed until the end of your next turn.",
  // Cleric
  "Channel Divinity": "You can channel divine energy to fuel magical effects. You gain one use per short or long rest (two at level 6, three at level 18). Turn Undead is always available.",
  "Turn Undead": "As an action, each undead within 30 ft that can see or hear you must make a WIS save. On failure, it is turned for 1 minute — it must flee and can't take reactions.",
  "Destroy Undead": "When an undead fails its save against Turn Undead, it is instantly destroyed if its CR is below a threshold based on your level.",
  "Divine Intervention": "As an action, you call on your deity for aid. Roll d100 — if you roll equal to or under your cleric level, the deity intervenes. At level 20, it automatically succeeds.",
  "Divine Health": "You are immune to disease.",
  // Druid
  "Wild Shape": "As an action, you magically assume the shape of a beast you have seen. You can use this twice per short or long rest. Your level determines the max CR and movement types available.",
  "Natural Recovery": "During a short rest, you recover expended spell slots with a combined level equal to or less than half your druid level (rounded up). Once per long rest.",
  "Timeless Body": "Your age slows. For every 10 years that pass, your body ages only 1 year.",
  "Beast Spells": "You can cast spells in Wild Shape form. You can perform somatic and verbal components while transformed, but can't use material components.",
  // Fighter
  "Fighting Style": "You adopt a particular fighting style as your specialty. Options include Archery (+2 ranged attack), Defense (+1 AC in armor), Dueling (+2 damage one-handed), Great Weapon Fighting (reroll 1s and 2s on damage), Protection (impose disadvantage on attacks against allies), or Two-Weapon Fighting (add ability mod to off-hand damage).",
  "Second Wind": "On your turn, you can use a bonus action to regain 1d10 + fighter level HP. Once per short or long rest.",
  "Action Surge": "On your turn, you take one additional action. Once per short or long rest (twice at level 17).",
  "Extra Attack": "When you take the Attack action, you can attack twice instead of once (three times at Fighter 11, four at Fighter 20).",
  "Indomitable": "You can reroll a failed saving throw. You must use the new roll. Once per long rest (twice at level 13, three at level 17).",
  // Monk
  "Martial Arts": "While unarmed or using monk weapons (and not wearing armor/shield): use DEX for attack/damage, unarmed strikes deal 1d4 (scales), and you can make one unarmed strike as a bonus action after attacking.",
  Ki: "You have a pool of ki points equal to your monk level. Spend them to fuel Flurry of Blows, Patient Defense, and Step of the Wind. All ki points recharge on a short or long rest.",
  "Flurry of Blows": "After taking the Attack action, spend 1 ki point to make two unarmed strikes as a bonus action.",
  "Patient Defense": "Spend 1 ki point to take the Dodge action as a bonus action on your turn.",
  "Step of the Wind": "Spend 1 ki point to take the Disengage or Dash action as a bonus action. Your jump distance is doubled for the turn.",
  "Stunning Strike": "When you hit with a melee weapon attack, spend 1 ki point. The target must make a CON save or be stunned until the end of your next turn.",
  "Deflect Missiles": "Use your reaction to reduce ranged weapon damage by 1d10 + DEX mod + monk level. If reduced to 0, spend 1 ki to throw it back (monk weapon attack, 20/60 ft).",
  "Slow Fall": "Use your reaction to reduce falling damage by 5 times your monk level.",
  "Unarmored Movement": "Your speed increases by 10 ft while not wearing armor or a shield (scales with level).",
  "Evasion": "When you make a DEX save for half damage, you take no damage on a success and half on a failure.",
  "Stillness of Mind": "As an action, you end one charmed or frightened effect on yourself.",
  // Paladin
  "Divine Sense": "As an action, you detect celestials, fiends, and undead within 60 ft, and consecrated/desecrated ground. Uses equal to 1 + CHA modifier per long rest.",
  "Lay on Hands": "You have a healing pool equal to 5 times your paladin level. As an action, touch a creature and restore any number of HP from the pool. Spend 5 points to cure one disease or poison.",
  "Divine Smite": "When you hit with a melee weapon attack, spend a spell slot to deal extra radiant damage: 2d8 for a 1st-level slot, plus 1d8 per slot level above 1st (max 5d8). +1d8 vs undead/fiends.",
  "Sacred Oath": "At level 3, you swear an oath that grants you Channel Divinity options and oath spells. Your oath shapes your paladin abilities.",
  "Aura of Protection": "You and friendly creatures within 10 ft gain a bonus to saving throws equal to your CHA modifier (minimum +1). Requires you to be conscious.",
  "Aura of Courage": "You and friendly creatures within 10 ft can't be frightened while you are conscious.",
  // Ranger
  "Favored Enemy": "You have advantage on Survival checks to track your chosen enemy type and on INT checks to recall information about them.",
  "Natural Explorer": "In your favored terrain: difficult terrain doesn't slow your group, you can't become lost except by magic, you remain alert to danger while foraging/navigating, you move stealthily at normal pace, find twice as much food, and learn exact details of tracked creatures.",
  "Primeval Awareness": "Spend a spell slot to sense aberrations, celestials, dragons, elementals, fey, fiends, and undead within 1 mile (6 miles in favored terrain) for 1 minute per slot level.",
  "Land's Stride": "Moving through nonmagical difficult terrain costs no extra movement. You can pass through nonmagical plants without being slowed or taking damage.",
  "Hide in Plain Sight": "Spend 1 minute creating camouflage. While stationary against a solid surface, you gain +10 to Stealth checks.",
  "Vanish": "You can use the Hide action as a bonus action. You also can't be tracked by nonmagical means unless you choose to leave a trail.",
  // Rogue
  "Sneak Attack": "Once per turn, deal extra damage (1d6, scales with level) when hitting with a finesse or ranged weapon and you have advantage, or an enemy of the target is within 5 ft of it.",
  "Thieves' Cant": "A secret mix of dialect, jargon, and code that lets you hide messages in normal conversation. You can also understand secret signs and symbols used by thieves.",
  "Cunning Action": "You can use a bonus action to Dash, Disengage, or Hide on each of your turns.",
  "Uncanny Dodge": "When an attacker you can see hits you, use your reaction to halve the attack's damage.",
  "Reliable Talent": "Whenever you make an ability check that uses a proficiency you have, treat any d20 roll of 9 or lower as a 10.",
  // Sorcerer
  "Sorcery Points": "You have sorcery points equal to your sorcerer level. Spend them to create spell slots or fuel Metamagic options. Recharge on long rest.",
  "Metamagic": "You learn ways to twist your spells. Options include Careful Spell, Distant Spell, Empowered Spell, Extended Spell, Heightened Spell, Quickened Spell, Subtle Spell, and Twinned Spell.",
  "Font of Magic": "You can convert sorcery points into spell slots and vice versa. Creating a slot costs points equal to the slot level. Converting a slot gives points equal to the slot level.",
  // Warlock
  "Eldritch Invocations": "You gain eldritch invocations that grant you special abilities. Some enhance Eldritch Blast, others give at-will spells or unique features. You learn more as you level.",
  "Pact Boon": "At level 3, your patron grants you a boon: Pact of the Chain (improved familiar), Pact of the Blade (create a weapon), or Pact of the Tome (Book of Shadows with cantrips).",
  "Mystic Arcanum": "At levels 11-17, your patron teaches you a magical secret (spell of 6th-9th level). You can cast each once per long rest without spending a spell slot.",
  "Pact Magic": "You cast spells using Charisma. Your spell slots are always cast at your highest slot level and recharge on a short rest, unlike other casters.",
  // Wizard
  "Arcane Recovery": "Once per day after a short rest, you recover expended spell slots with a combined level equal to or less than half your wizard level (rounded up).",
  "Spell Mastery": "At level 18, choose a 1st-level and a 2nd-level spell. You can cast them at their lowest level without expending a spell slot, as long as they are prepared.",
  "Signature Spells": "At level 20, choose two 3rd-level spells. You always have them prepared, they don't count against prepared spells, and you can cast each once at 3rd level without a slot per short rest.",
  "Arcane Tradition": "At level 2, you choose a school of magic that grants you special features. Your chosen school's spells cost half the gold and time to copy into your spellbook.",
  // General class features
  Spellcasting: "You can cast spells using spell slots. Your class determines your spellcasting ability, spell list, and how you prepare/learn spells. Slots recharge on a long rest (short rest for Warlocks).",
  "Spellcasting Focus": "You can use a specific item (holy symbol, arcane focus, druidic focus, component pouch) as a spellcasting focus, replacing material components that don't have a gold cost.",
};

const SPELL_TOOLTIPS: Record<string, string> = {
  // Cantrips
  Thaumaturgy: "Transmutation cantrip. Create minor supernatural effects: booming voice, flickering flames, trembling ground, slamming doors.",
  "Eldritch Blast": "Evocation cantrip. 1d10 force damage beam, 120 ft range. Additional beams at higher levels.",
  "Fire Bolt": "Evocation cantrip. 1d10 fire damage, 120 ft range. Ignites flammable objects.",
  "Sacred Flame": "Evocation cantrip. 1d8 radiant damage, DEX save, 60 ft. Ignores cover.",
  "Mage Hand": "Conjuration cantrip. Spectral hand manipulates objects up to 10 lbs within 30 ft.",
  Prestidigitation: "Transmutation cantrip. Minor magical tricks: light, clean, warm, flavor, color, small illusions.",
  "Minor Illusion": "Illusion cantrip. Create a sound or image of an object within 30 ft. Lasts 1 minute.",
  "Chill Touch": "Necromancy cantrip. 1d8 necrotic damage, 120 ft. Target can't regain HP until your next turn.",
  "Vicious Mockery": "Enchantment cantrip. 1d4 psychic damage on failed WIS save. Target has disadvantage on next attack.",
  "Poison Spray": "Conjuration cantrip. 1d12 poison damage, CON save, 10 ft range.",
  Guidance: "Divination cantrip. Touch. Target adds 1d4 to one ability check within 1 minute. Concentration.",
  Light: "Evocation cantrip. Touch an object — it sheds bright light 20 ft, dim light 20 ft more. 1 hour.",
  "Ray of Frost": "Evocation cantrip. 1d8 cold damage, 60 ft. Target's speed reduced by 10 ft until your next turn.",
  "Shocking Grasp": "Evocation cantrip. 1d8 lightning damage, melee. Advantage vs metal armor. Target can't take reactions.",
  Druidcraft: "Transmutation cantrip. Predict weather, bloom flowers, create sensory effects, light/snuff small flames.",
  "Produce Flame": "Conjuration cantrip. 1d8 fire damage thrown 30 ft, or hold as a torch. Lasts 10 minutes.",
  Shillelagh: "Transmutation cantrip. Bonus action. Club or quarterstaff uses your spellcasting modifier, deals 1d8. 1 minute.",
  "Spare the Dying": "Necromancy cantrip. Touch a creature at 0 HP — it stabilizes. No effect on undead or constructs.",
  "Toll the Dead": "Necromancy cantrip. 1d8 necrotic (1d12 if damaged), WIS save, 60 ft.",
  Resistance: "Abjuration cantrip. Touch. Target adds 1d4 to one saving throw within 1 minute. Concentration.",
  "Blade Ward": "Abjuration cantrip. Resistance to bludgeoning, piercing, and slashing from weapon attacks until end of next turn.",
  "True Strike": "Divination cantrip. Gain advantage on your first attack roll against a target next turn. Concentration.",
  Friends: "Enchantment cantrip. Advantage on CHA checks against one creature for 1 minute. It knows afterward. Concentration.",
  "Dancing Lights": "Evocation cantrip. Up to 4 torch-sized lights within 120 ft. Move them 60 ft as bonus action. Concentration, 1 min.",
  Mending: "Transmutation cantrip. Repair a single break or tear in an object you touch.",
  Message: "Transmutation cantrip. Whisper a message to a creature within 120 ft. They can reply.",
  // Level 1 Spells
  "Healing Word": "1st level evocation. Bonus action, 60 ft. Heal 1d4 + spellcasting modifier HP.",
  "Cure Wounds": "1st level evocation. Touch. Heal 1d8 + spellcasting modifier HP.",
  Shield: "1st level abjuration. Reaction. +5 AC until start of your next turn, including against the triggering attack.",
  "Magic Missile": "1st level evocation. Three darts, 1d4+1 force each, auto-hit. 120 ft range.",
  "Hellish Rebuke": "1st level evocation. Reaction when damaged. 2d10 fire damage, DEX save for half. 60 ft.",
  "Guiding Bolt": "1st level evocation. 4d6 radiant damage, 120 ft. Next attack against target has advantage.",
  Bless: "1st level enchantment. Concentration, 1 min. Up to 3 creatures add 1d4 to attacks and saves.",
  "Thunderwave": "1st level evocation. 2d8 thunder in 15 ft cube. CON save or pushed 10 ft.",
  "Burning Hands": "1st level evocation. 3d6 fire in 15 ft cone. DEX save for half.",
  "Charm Person": "1st level enchantment. Target regards you as friendly on failed WIS save. 1 hour.",
  Sleep: "1st level enchantment. 5d8 HP of creatures in 20 ft radius fall asleep. Lowest HP first.",
  "Detect Magic": "1st level divination. Ritual. Sense magic within 30 ft for 10 minutes. Concentration.",
  "Mage Armor": "1st level abjuration. Touch. Target's AC becomes 13 + DEX modifier. 8 hours. No concentration.",
  "Faerie Fire": "1st level evocation. Concentration, 1 min. Creatures in 20 ft cube outlined in light. Attacks have advantage.",
  "Hex": "1st level enchantment. Bonus action. 1d6 necrotic on each hit. Target has disadvantage on one ability check. Concentration, 1 hr.",
  "Witch Bolt": "1st level evocation. 1d12 lightning, 30 ft. Use action on subsequent turns for automatic 1d12. Concentration.",
  "Entangle": "1st level conjuration. Concentration, 1 min. 20 ft square of grasping vines. STR save or restrained.",
  "Goodberry": "1st level transmutation. Create 10 berries, each heals 1 HP and provides a day's nourishment.",
  "Hunter's Mark": "1st level divination. Bonus action. +1d6 damage to target on each hit. Advantage on tracking. Concentration.",
  "Disguise Self": "1st level illusion. Change your appearance for 1 hour. No concentration.",
  "Command": "1st level enchantment. Speak a one-word command. Target obeys on failed WIS save.",
  "Inflict Wounds": "1st level necromancy. Melee spell attack. 3d10 necrotic damage.",
  "Shield of Faith": "1st level abjuration. Bonus action. +2 AC to target for 10 minutes. Concentration.",
  "Sanctuary": "1st level abjuration. Bonus action. Attackers must make WIS save or choose new target. 1 minute.",
  "Chromatic Orb": "1st level evocation. 3d8 damage of chosen type (acid, cold, fire, lightning, poison, thunder). 90 ft.",
  "Feather Fall": "1st level transmutation. Reaction. Up to 5 creatures fall at 60 ft/round, taking no fall damage.",
  "Fog Cloud": "1st level conjuration. 20 ft sphere of fog. Heavily obscured area. Concentration, 1 hr.",
  "Identify": "1st level divination. Ritual. Touch an object to learn its properties and how to use them.",
  "Comprehend Languages": "1st level divination. Ritual. Understand any spoken language you hear for 1 hour.",
  "Tasha's Hideous Laughter": "1st level enchantment. Target falls prone laughing on failed WIS save. Concentration, 1 min.",
  "Color Spray": "1st level illusion. 6d10 HP of creatures in 15 ft cone are blinded until end of your next turn.",
  "False Life": "1st level necromancy. Gain 1d4+4 temporary HP for 1 hour.",
  "Longstrider": "1st level transmutation. Touch. Target's speed increases by 10 ft for 1 hour.",
  "Speak with Animals": "1st level divination. Ritual. Communicate with beasts for 10 minutes.",
  "Animal Friendship": "1st level enchantment. Beast of INT 3 or less is charmed on failed WIS save. 24 hours.",
  "Wrathful Smite": "1st level evocation. Bonus action. Next melee hit deals +1d6 psychic. Target frightened on failed WIS save. Concentration.",
  "Thunderous Smite": "1st level evocation. Bonus action. Next melee hit deals +2d6 thunder. Target pushed 10 ft on failed STR save.",
  "Compelled Duel": "1st level enchantment. Bonus action. Target has disadvantage on attacks against others. Concentration, 1 min.",
  "Searing Smite": "1st level evocation. Bonus action. Next melee hit deals +1d6 fire. Target takes 1d6 fire each turn. Concentration.",
  "Divine Favor": "1st level evocation. Bonus action. Your weapon attacks deal +1d4 radiant. Concentration, 1 min.",
  "Armor of Agathys": "1st level abjuration. Gain 5 temp HP. Melee attackers take 5 cold damage while temp HP remain. 1 hour.",
  "Arms of Hadar": "1st level conjuration. 2d6 necrotic in 10 ft radius. STR save or can't take reactions. No light.",
  "Dissonant Whispers": "1st level enchantment. 3d6 psychic damage, WIS save for half. Failed save: target uses reaction to move away.",
  "Heroism": "1st level enchantment. Touch. Target gains temp HP equal to your spellcasting modifier each turn. Concentration, 1 min.",
};

// ── DndTooltip component ──────────────────────────────────────

function DndTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: false });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewH = window.innerHeight;
    const above = rect.bottom > viewH * 0.7;
    setPosition({
      top: above ? rect.top : rect.bottom,
      left: Math.min(Math.max(rect.left + rect.width / 2, 150), window.innerWidth - 150),
      above,
    });
    setVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setVisible(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Dismiss on tap outside
  useEffect(() => {
    if (!visible) return;
    const handler = (e: PointerEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        hideTooltip();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [visible, hideTooltip]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onTouchStart={() => {
          longPressTimer.current = setTimeout(showTooltip, 400);
        }}
        onTouchEnd={() => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }}
        onTouchMove={() => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }}
        style={{ cursor: "help" }}
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            top: position.above ? position.top - 8 : position.top + 8,
            left: position.left,
            transform: position.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            maxWidth: 280,
            padding: "8px 12px",
            background: C.tooltipBg,
            border: `1px solid ${C.tooltipBorder}`,
            borderRadius: 6,
            color: C.parchment,
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: bodyFont,
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}

// ── Session-level tooltip cache for API fallback ────────────────
const tooltipCache = new Map<string, string>();
const tooltipPending = new Set<string>();

/** Tooltip wrapper that falls back to API for unknown features. */
function FeatureTooltip({
  featureName,
  characterClass,
  characterLevel,
  children,
}: {
  featureName: string;
  characterClass: string;
  characterLevel: number;
  children: React.ReactNode;
}) {
  // Check static lookups first
  const staticTip = TRAIT_TOOLTIPS[featureName] ?? SPELL_TOOLTIPS[featureName];
  const [apiTip, setApiTip] = useState<string | null>(() => tooltipCache.get(featureName) ?? null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const tip = staticTip ?? apiTip;

  const handleHover = useCallback(() => {
    if (tip || fetchedRef.current || tooltipPending.has(featureName)) return;
    fetchedRef.current = true;
    tooltipPending.add(featureName);
    setLoading(true);
    fetch("/api/tooltip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureName, characterClass, characterLevel }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.description) {
          tooltipCache.set(featureName, data.description);
          setApiTip(data.description);
        }
      })
      .catch(() => {})
      .finally(() => {
        tooltipPending.delete(featureName);
        setLoading(false);
      });
  }, [featureName, characterClass, characterLevel, tip]);

  if (tip) {
    return <DndTooltip text={tip}>{children}</DndTooltip>;
  }

  // No static tip — render with hover-trigger API fetch
  return (
    <span onMouseEnter={handleHover} onTouchStart={handleHover} style={{ cursor: "help" }}>
      {children}
      {loading && (
        <span style={{ marginLeft: 4, fontSize: 9, color: C.gold, opacity: 0.6 }} className="animate-pulse">
          ...
        </span>
      )}
    </span>
  );
}

// ── D&D 5e saving throw proficiencies by class ──────────────────

const SAVE_PROFICIENCIES: Record<CharacterClass, string[]> = {
  Barbarian: ["STR", "CON"],
  Bard: ["DEX", "CHA"],
  Cleric: ["WIS", "CHA"],
  Druid: ["INT", "WIS"],
  Fighter: ["STR", "CON"],
  Monk: ["STR", "DEX"],
  Paladin: ["WIS", "CHA"],
  Ranger: ["STR", "DEX"],
  Rogue: ["DEX", "INT"],
  Sorcerer: ["CON", "CHA"],
  Warlock: ["WIS", "CHA"],
  Wizard: ["INT", "WIS"],
};

// ── D&D 5e skills and their governing ability ───────────────────

const SKILLS: [string, string][] = [
  ["Acrobatics", "DEX"],
  ["Animal Handling", "WIS"],
  ["Arcana", "INT"],
  ["Athletics", "STR"],
  ["Deception", "CHA"],
  ["History", "INT"],
  ["Insight", "WIS"],
  ["Intimidation", "CHA"],
  ["Investigation", "INT"],
  ["Medicine", "WIS"],
  ["Nature", "INT"],
  ["Perception", "WIS"],
  ["Performance", "CHA"],
  ["Persuasion", "CHA"],
  ["Religion", "INT"],
  ["Sleight of Hand", "DEX"],
  ["Stealth", "DEX"],
  ["Survival", "WIS"],
];

// ── Hit dice by class ───────────────────────────────────────────

const HIT_DICE: Record<CharacterClass, string> = {
  Barbarian: "d12",
  Fighter: "d10",
  Paladin: "d10",
  Ranger: "d10",
  Bard: "d8",
  Cleric: "d8",
  Druid: "d8",
  Monk: "d8",
  Rogue: "d8",
  Warlock: "d8",
  Sorcerer: "d6",
  Wizard: "d6",
};

// ── Racial speed ────────────────────────────────────────────────

const RACIAL_SPEED: Record<string, number> = {
  Human: 30, Elf: 30, Dwarf: 25, Halfling: 25, Gnome: 25,
  "Half-Elf": 30, "Half-Orc": 30, Tiefling: 30, Dragonborn: 30,
};

// ── Racial traits ───────────────────────────────────────────────

const RACIAL_TRAITS: Record<string, string[]> = {
  Human: ["Extra Language"],
  Elf: ["Darkvision (60 ft)", "Fey Ancestry", "Trance"],
  Dwarf: ["Darkvision (60 ft)", "Dwarven Resilience", "Stonecunning"],
  Halfling: ["Lucky", "Brave", "Halfling Nimbleness"],
  Gnome: ["Darkvision (60 ft)", "Gnome Cunning"],
  "Half-Elf": ["Darkvision (60 ft)", "Fey Ancestry", "Skill Versatility"],
  "Half-Orc": ["Darkvision (60 ft)", "Relentless Endurance", "Savage Attacks"],
  Tiefling: ["Darkvision (60 ft)", "Hellish Resistance", "Infernal Legacy"],
  Dragonborn: ["Breath Weapon", "Damage Resistance"],
};

// ── Weapon categorization for attacks table ─────────────────────

const WEAPON_DATA: Record<string, { damage: string; type: string }> = {
  greataxe: { damage: "1d12", type: "slashing" },
  handaxe: { damage: "1d6", type: "slashing" },
  battleaxe: { damage: "1d8", type: "slashing" },
  rapier: { damage: "1d8", type: "piercing" },
  longsword: { damage: "1d8", type: "slashing" },
  shortsword: { damage: "1d6", type: "piercing" },
  greatsword: { damage: "2d6", type: "slashing" },
  mace: { damage: "1d6", type: "bludgeoning" },
  scimitar: { damage: "1d6", type: "slashing" },
  dagger: { damage: "1d4", type: "piercing" },
  quarterstaff: { damage: "1d6", type: "bludgeoning" },
  longbow: { damage: "1d8", type: "piercing" },
  shortbow: { damage: "1d6", type: "piercing" },
  spear: { damage: "1d6", type: "piercing" },
  javelin: { damage: "1d6", type: "piercing" },
  crossbow: { damage: "1d8", type: "piercing" },
  trident: { damage: "1d6", type: "piercing" },
  warhammer: { damage: "1d8", type: "bludgeoning" },
  flail: { damage: "1d8", type: "bludgeoning" },
  morningstar: { damage: "1d8", type: "piercing" },
  maul: { damage: "2d6", type: "bludgeoning" },
  halberd: { damage: "1d10", type: "slashing" },
  pike: { damage: "1d10", type: "piercing" },
  glaive: { damage: "1d10", type: "slashing" },
  lance: { damage: "1d12", type: "piercing" },
  whip: { damage: "1d4", type: "slashing" },
};

function getWeaponInfo(itemName: string): { damage: string; type: string } | null {
  const lower = itemName.toLowerCase();
  for (const [weapon, info] of Object.entries(WEAPON_DATA)) {
    if (lower.includes(weapon)) return info;
  }
  return null;
}

// ── Finesse / ranged weapons use DEX ────────────────────────────

const FINESSE_WEAPONS = ["rapier", "shortsword", "dagger", "scimitar", "whip"];
const RANGED_WEAPONS = ["longbow", "shortbow", "crossbow"];

function useDexForAttack(itemName: string): boolean {
  const lower = itemName.toLowerCase();
  return FINESSE_WEAPONS.some((w) => lower.includes(w)) || RANGED_WEAPONS.some((w) => lower.includes(w));
}

// ── Shared style helpers ────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: C.sectionBg,
  border: `1px solid ${C.goldBorder}`,
  borderRadius: 8,
  padding: 12,
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: headerFont,
  fontVariant: "small-caps",
  letterSpacing: "0.12em",
  color: C.gold,
  textTransform: "uppercase",
  marginBottom: 6,
  textAlign: "center",
};

function ProfDot({ filled }: { filled: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        border: `1.5px solid ${filled ? C.gold : C.goldMuted}`,
        backgroundColor: filled ? C.gold : "transparent",
        flexShrink: 0,
      }}
    />
  );
}

// ── Main component ──────────────────────────────────────────────

export function CharacterSheet({ onClose }: Props) {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();
  const { karmaHistory, fameHistory } = useKarmaStore();
  const [showKarmaHistory, setShowKarmaHistory] = useState(false);
  const [showFameHistory, setShowFameHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const equippedItems = character.equipped ?? [];
  const backpackItems = character.inventory.filter((item) => !equippedItems.includes(item));

  const alignment = getAlignment(character.karma);
  const alignmentLabel = ALIGNMENT_LABELS[alignment];

  const abilityMod = (score: number) => Math.floor((score - 10) / 2);
  const fmtMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`);

  const profBonus = Math.floor((character.level - 1) / 4) + 2;
  const speed = RACIAL_SPEED[character.race] ?? 30;
  const hitDie = HIT_DICE[character.class] ?? "d8";
  const initiative = abilityMod(character.abilityScores.dexterity);
  const passivePerception = 10 + abilityMod(character.abilityScores.wisdom);
  const racialTraits = RACIAL_TRAITS[character.race] ?? [];

  const abilityMap: Record<string, number> = {
    STR: character.abilityScores.strength,
    DEX: character.abilityScores.dexterity,
    CON: character.abilityScores.constitution,
    INT: character.abilityScores.intelligence,
    WIS: character.abilityScores.wisdom,
    CHA: character.abilityScores.charisma,
  };

  const classSaves = SAVE_PROFICIENCIES[character.class] ?? [];

  const weapons = character.inventory
    .map((item) => {
      const info = getWeaponInfo(item);
      if (!info) return null;
      const usesDex = useDexForAttack(item);
      const atkAbility = usesDex ? character.abilityScores.dexterity : character.abilityScores.strength;
      const atkMod = abilityMod(atkAbility) + profBonus;
      const dmgMod = abilityMod(atkAbility);
      return { name: item, atkBonus: fmtMod(atkMod), damage: `${info.damage}${dmgMod >= 0 ? "+" : ""}${dmgMod}`, type: info.type };
    })
    .filter(Boolean) as { name: string; atkBonus: string; damage: string; type: string }[];

  const hpPercent = Math.round((character.hp / character.maxHp) * 100);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "92vw",
          maxWidth: 768,
          height: "88vh",
          background: C.bg,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 12,
          boxShadow: `0 0 60px rgba(201,162,39,0.08), inset 0 1px 0 rgba(201,162,39,0.1)`,
          overflowY: "auto",
          color: C.parchment,
          fontFamily: bodyFont,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER BAR ═══ */}
        <div style={{ padding: "20px 24px 12px", borderBottom: `1px solid ${C.crimsonBorder}`, background: "linear-gradient(180deg, rgba(26,10,0,0.8) 0%, transparent 100%)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: headerFont, color: C.gold, letterSpacing: "0.04em", margin: 0 }}>
                {character.name}
              </h2>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: C.goldMuted, lineHeight: 1.6 }}>
              <div><span style={{ fontWeight: 700, color: C.parchment, fontFamily: headerFont }}>{character.class} {character.level}</span></div>
              <div>{character.race} ({character.gender})</div>
              <div>{alignmentLabel}</div>
              <div style={{ color: C.gold }}>XP: {character.xp}{character.xpToNextLevel !== Infinity ? ` / ${character.xpToNextLevel}` : " (MAX)"}</div>
            </div>
          </div>
        </div>

        {/* ═══ THREE-COLUMN LAYOUT ═══ */}
        <div className="grid grid-cols-[140px_1fr_180px] gap-4 p-4">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-2">

            {/* Ability Scores */}
            {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => {
              const val = abilityMap[ab];
              const m = abilityMod(val);
              return (
                <DndTooltip key={ab} text={ABILITY_TOOLTIPS[ab]}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.statBg, borderRadius: 4, padding: "6px 10px", border: `1px solid ${C.goldBorder}` }}>
                    <span style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", width: 32 }}>{ab}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: C.gold, fontFamily: headerFont, lineHeight: 1 }}>{fmtMod(m)}</span>
                    <span style={{ fontSize: 10, color: C.parchmentMuted, background: "rgba(201,162,39,0.08)", borderRadius: 10, padding: "1px 6px" }}>{val}</span>
                  </div>
                </DndTooltip>
              );
            })}

            {/* Proficiency Bonus & Inspiration */}
            <div className="grid grid-cols-2 gap-1.5">
              <DndTooltip text="Proficiency Bonus — added to rolls you are trained in. Increases with level.">
                <div style={{ textAlign: "center", background: C.statBg, borderRadius: 4, padding: "6px 0", border: `1px solid ${C.goldBorder}` }}>
                  <div style={{ fontSize: 9, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Prof</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: C.gold, fontFamily: headerFont }}>+{profBonus}</div>
                </div>
              </DndTooltip>
              <DndTooltip text="Inspiration — spend for advantage on one roll. Awarded for great roleplay.">
                <div style={{ textAlign: "center", background: C.statBg, borderRadius: 4, padding: "6px 0", border: `1px solid ${C.goldBorder}` }}>
                  <div style={{ fontSize: 9, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Insp</div>
                  <div style={{ fontSize: 14, color: C.parchmentMuted }}>&#x25CB;</div>
                </div>
              </DndTooltip>
            </div>

            {/* Saving Throws */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Saving Throws</div>
              {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => {
                const val = abilityMap[ab];
                const isProficient = classSaves.includes(ab);
                const saveMod = abilityMod(val) + (isProficient ? profBonus : 0);
                const profText = isProficient ? "You are proficient in this save." : "You are not proficient in this save.";
                return (
                  <DndTooltip key={ab} text={`${SAVE_TOOLTIPS[ab]} ${profText}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "2px 0" }}>
                      <ProfDot filled={isProficient} />
                      <span style={{ fontFamily: "monospace", width: 28, textAlign: "right", fontWeight: 600, color: C.parchment }}>{fmtMod(saveMod)}</span>
                      <span style={{ color: C.goldMuted }}>{ab}</span>
                    </div>
                  </DndTooltip>
                );
              })}
            </div>

            {/* Passive Perception */}
            <DndTooltip text="Your baseline awareness without actively looking. Equal to 10 plus your Perception modifier. The DM checks this against hidden threats.">
              <div style={{ textAlign: "center", background: C.statBg, borderRadius: 4, padding: "6px 0", border: `1px solid ${C.goldBorder}` }}>
                <div style={{ fontSize: 9, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Passive Perception</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{passivePerception}</div>
              </div>
            </DndTooltip>

            {/* Death Saves — moved here from center column */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Death Saves</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 10, color: "#22c55e" }}>S </span>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      display: "inline-block", width: 12, height: 12, borderRadius: "50%", marginRight: 2,
                      border: `1.5px solid ${i < character.deathSaves.successes ? "#22c55e" : C.goldMuted}`,
                      backgroundColor: i < character.deathSaves.successes ? "#22c55e" : "transparent",
                    }} />
                  ))}
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "#dc2626" }}>F </span>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      display: "inline-block", width: 12, height: 12, borderRadius: "50%", marginRight: 2,
                      border: `1.5px solid ${i < character.deathSaves.failures ? "#dc2626" : C.goldMuted}`,
                      backgroundColor: i < character.deathSaves.failures ? "#dc2626" : "transparent",
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Location — moved here from right column */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Current Location</div>
              <div style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#22c55e" }}>&#x25CF;</span>
                <span style={{ color: C.gold }}>{location}</span>
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN ── */}
          <div className="space-y-4">

            {/* AC / Initiative / Speed row */}
            <div className="grid grid-cols-3 gap-3">
              <DndTooltip text="Armor Class — minimum attack roll needed to hit you. Set by armor, DEX, shield, and class features.">
                <div style={{ textAlign: "center", background: C.sectionBg, borderRadius: 8, padding: "12px 0", border: `2px solid ${C.goldBorderStrong}` }}>
                  <div style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Armor Class</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: C.gold, fontFamily: headerFont }}>{character.ac}</div>
                </div>
              </DndTooltip>
              <DndTooltip text="Added to your d20 roll at combat start to determine turn order.">
                <div style={{ textAlign: "center", background: C.sectionBg, borderRadius: 8, padding: "12px 0", border: `1px solid ${C.goldBorder}` }}>
                  <div style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Initiative</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{fmtMod(initiative)}</div>
                </div>
              </DndTooltip>
              <DndTooltip text="Feet you can move per turn. Can be split before and after your action.">
                <div style={{ textAlign: "center", background: C.sectionBg, borderRadius: 8, padding: "12px 0", border: `1px solid ${C.goldBorder}` }}>
                  <div style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Speed</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{speed}</div>
                  <div style={{ fontSize: 10, color: C.goldMuted }}>ft</div>
                </div>
              </DndTooltip>
            </div>

            {/* Hit Points */}
            <DndTooltip text="Your current health. Reach 0 and you fall unconscious, making Death Saving Throws each turn.">
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Hit Points</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div style={{ fontSize: 10, color: C.goldMuted }}>Maximum</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#dc2626", fontFamily: headerFont }}>{character.maxHp}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.goldMuted }}>Current</div>
                    <div style={{
                      fontSize: 22, fontWeight: 900, fontFamily: headerFont,
                      color: character.hp > character.maxHp * 0.5 ? "#22c55e" : character.hp > character.maxHp * 0.25 ? "#f97316" : "#dc2626",
                    }}>
                      {character.hp}
                    </div>
                  </div>
                </div>
                {/* HP Bar */}
                <div style={{ width: "100%", background: "rgba(139,0,0,0.3)", borderRadius: 6, height: 10, overflow: "hidden", border: `1px solid ${C.crimsonBorder}`, marginTop: 8 }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 6,
                      transition: "width 0.5s",
                      width: `${hpPercent}%`,
                      background: hpPercent > 60 ? "linear-gradient(90deg, #8b0000, #dc2626)" : hpPercent > 25 ? "linear-gradient(90deg, #8b0000, #f97316)" : "#8b0000",
                    }}
                  />
                </div>
              </div>
            </DndTooltip>

            {/* Attacks & Spellcasting */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Attacks &amp; Spellcasting</div>
              {weapons.length > 0 ? (
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", fontWeight: 500, paddingBottom: 4, fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em" }}>Name</th>
                      <th style={{ textAlign: "center", fontWeight: 500, paddingBottom: 4, fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em" }}>Atk Bonus</th>
                      <th style={{ textAlign: "right", fontWeight: 500, paddingBottom: 4, fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em" }}>Damage/Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.slice(0, 5).map((w, idx) => (
                      <tr key={w.name} style={{ background: idx % 2 === 0 ? C.rowOdd : C.rowEven }}>
                        <td style={{ padding: "4px 4px", color: C.parchment, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</td>
                        <td style={{ padding: "4px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 600, color: C.gold }}>{w.atkBonus}</td>
                        <td style={{ padding: "4px 4px", textAlign: "right", fontFamily: "monospace", color: C.parchment }}>
                          {w.damage}{" "}
                          <DndTooltip text={DAMAGE_TYPE_TOOLTIPS[w.type] ?? w.type}>
                            <span style={{ color: C.goldMuted }}>{w.type}</span>
                          </DndTooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 11, color: C.goldMuted, fontStyle: "italic" }}>No weapons equipped</div>
              )}
            </div>

            {/* Equipment — Worn */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Worn Equipment</div>
              {equippedItems.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-1">
                  {equippedItems.map((item) => {
                    const info = getItemInfo(item);
                    const icon = getItemIcon(item);
                    const isIdentified = !info?.isMagical || character.identifiedItems.includes(item);
                    const isMagic = info?.isMagical;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(selectedItem === item ? null : item)}
                          style={{
                            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                            fontSize: 11, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                            background: isMagic ? C.purpleMuted : "rgba(201,162,39,0.05)",
                            border: `1px solid ${isMagic ? "rgba(168,85,247,0.3)" : C.goldBorder}`,
                            color: C.parchment, fontFamily: bodyFont,
                            outline: selectedItem === item ? `1px solid ${C.gold}` : "none",
                          }}
                        >
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                          {isMagic && !isIdentified && <span style={{ fontSize: 9, color: C.purple, flexShrink: 0 }}>???</span>}
                        </button>
                        {selectedItem === item && (
                          <div style={{ margin: "4px 4px 0", padding: 8, background: "rgba(201,162,39,0.05)", borderRadius: 4, fontSize: 10, color: C.parchmentMuted, border: `1px solid ${C.goldBorder}` }}>
                            <div>{info?.description ?? "A mysterious item."}</div>
                            {isMagic && isIdentified && info?.magicalProperties && (
                              <div style={{ marginTop: 4, color: C.purple, fontWeight: 600 }}>{info.magicalProperties}</div>
                            )}
                            {isMagic && !isIdentified && (
                              <div style={{ marginTop: 4, color: C.purple, fontStyle: "italic" }}>Magical properties unknown. Requires identification.</div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{ fontSize: 11, color: C.goldMuted, fontStyle: "italic" }}>Nothing equipped</div>
              )}
            </div>

            {/* Backpack / Inventory */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={sectionHeaderStyle}>Backpack</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: headerFont }}>{character.gold} GP</div>
              </div>
              {backpackItems.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-1">
                  {backpackItems.map((item) => {
                    const info = getItemInfo(item);
                    const icon = getItemIcon(item);
                    const isIdentified = !info?.isMagical || character.identifiedItems.includes(item);
                    const isMagic = info?.isMagical;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(selectedItem === item ? null : item)}
                          style={{
                            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                            fontSize: 11, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                            background: isMagic ? C.purpleMuted : "rgba(201,162,39,0.05)",
                            border: `1px solid ${isMagic ? "rgba(168,85,247,0.3)" : C.goldBorder}`,
                            color: C.parchment, fontFamily: bodyFont,
                            outline: selectedItem === item ? `1px solid ${C.gold}` : "none",
                          }}
                        >
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                          {isMagic && !isIdentified && <span style={{ fontSize: 9, color: C.purple, flexShrink: 0 }}>???</span>}
                        </button>
                        {selectedItem === item && (
                          <div style={{ margin: "4px 4px 0", padding: 8, background: "rgba(201,162,39,0.05)", borderRadius: 4, fontSize: 10, color: C.parchmentMuted, border: `1px solid ${C.goldBorder}` }}>
                            <div>{info?.description ?? "A mysterious item."}</div>
                            {isMagic && isIdentified && info?.magicalProperties && (
                              <div style={{ marginTop: 4, color: C.purple, fontWeight: 600 }}>{info.magicalProperties}</div>
                            )}
                            {isMagic && !isIdentified && (
                              <div style={{ marginTop: 4, color: C.purple, fontStyle: "italic" }}>Magical properties unknown. Requires identification.</div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{ fontSize: 11, color: C.goldMuted, fontStyle: "italic" }}>Empty</div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">

            {/* Alignment / Karma */}
            <DndTooltip text="Your moral alignment based on your in-game choices. Affects how NPCs treat you and divine reactions.">
              <button
                type="button"
                onClick={() => setShowKarmaHistory(true)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  ...sectionStyle,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.goldBorder)}
              >
                <div style={sectionHeaderStyle}>Alignment</div>
                <div style={{
                  fontSize: 13, fontWeight: 700, fontFamily: headerFont,
                  color: character.karma > 25 ? "#22c55e" : character.karma < -25 ? "#dc2626" : C.parchmentMuted,
                }}>
                  {alignmentLabel}
                </div>
                <div style={{ fontSize: 10, color: C.goldMuted, marginTop: 4 }}>
                  Karma: {character.karma > 0 ? "+" : ""}{character.karma}
                </div>
                {karmaHistory.length > 0 && (
                  <div style={{ fontSize: 10, color: C.goldMuted, textDecoration: "underline" }}>
                    {karmaHistory.length} moral action{karmaHistory.length > 1 ? "s" : ""} — view history
                  </div>
                )}
              </button>
            </DndTooltip>

            {/* Fame */}
            <DndTooltip text="Your reputation across the world. High fame opens new opportunities. Notoriety can make life dangerous.">
              <button
                type="button"
                onClick={() => setShowFameHistory(true)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  ...sectionStyle,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.goldBorder)}
              >
                <div style={sectionHeaderStyle}>Fame</div>
                <div style={{
                  fontSize: 13, fontWeight: 700, fontFamily: headerFont,
                  color: character.fame >= 75 ? "#fbbf24" : character.fame >= 40 ? "#38bdf8" : character.fame >= 15 ? C.parchment : C.goldMuted,
                }}>
                  {character.fame >= 75 ? "Legendary" :
                   character.fame >= 50 ? "Renowned" :
                   character.fame >= 30 ? "Well-Known" :
                   character.fame >= 15 ? "Recognized" :
                   "Unknown"}
                </div>
                <div style={{ fontSize: 10, color: C.goldMuted, marginTop: 4 }}>
                  Score: {character.fame}
                </div>
                {fameHistory.length > 0 && (
                  <div style={{ fontSize: 10, color: C.goldMuted, textDecoration: "underline" }}>
                    {fameHistory.length} event{fameHistory.length > 1 ? "s" : ""} — view history
                  </div>
                )}
              </button>
            </DndTooltip>

            {/* Racial Traits & Features */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Features &amp; Traits</div>
              <div style={{ fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", marginBottom: 4 }}>{character.race} Traits</div>
              <ul style={{ listStyle: "none", margin: "0 0 12px 0", padding: 0 }} className="space-y-0.5">
                {(character.racialTraits?.length > 0 ? character.racialTraits : racialTraits).map((trait) => (
                  <li key={trait}>
                    <FeatureTooltip featureName={trait} characterClass={character.class} characterLevel={character.level}>
                      <span style={{ fontSize: 11, color: C.parchment }}>{trait}</span>
                    </FeatureTooltip>
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", marginBottom: 4 }}>{character.class} Features</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-0.5">
                <li>
                  <DndTooltip text="Rolled during a Short Rest to recover HP. Roll the die and add your CON modifier per die spent.">
                    <span style={{ fontSize: 11, color: C.parchment }}>Hit Die: {hitDie}</span>
                  </DndTooltip>
                </li>
                <li style={{ fontSize: 11, color: C.parchment }}>Save Prof: {classSaves.join(", ")}</li>
                {character.fightingStyle && (
                  <li>
                    <DndTooltip text={TRAIT_TOOLTIPS["Fighting Style"] ?? `Fighting Style: ${character.fightingStyle}`}>
                      <span style={{ fontSize: 11, color: C.parchment }}>Fighting Style: {character.fightingStyle}</span>
                    </DndTooltip>
                  </li>
                )}
              </ul>
            </div>

            {/* Cantrips & Spells */}
            {(character.cantrips?.length > 0 || character.spells?.length > 0) && (
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Spellcasting</div>
                {character.cantrips?.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: C.purple, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em", marginBottom: 4 }}>Cantrips</div>
                    <ul style={{ listStyle: "none", margin: "0 0 8px 0", padding: 0 }} className="space-y-0.5">
                      {character.cantrips.map((c) => (
                        <li key={c}>
                          <FeatureTooltip featureName={c} characterClass={character.class} characterLevel={character.level}>
                            <span style={{ fontSize: 11, color: C.parchment }}>{c}</span>
                          </FeatureTooltip>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {character.spells?.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "#60a5fa", fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em", marginBottom: 4 }}>1st Level</div>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-0.5">
                      {character.spells.map((s) => (
                        <li key={s}>
                          <FeatureTooltip featureName={s} characterClass={character.class} characterLevel={character.level}>
                            <span style={{ fontSize: 11, color: C.parchment }}>{s}</span>
                          </FeatureTooltip>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Skills */}
            <div style={{ ...sectionStyle, padding: 8 }}>
              <div style={sectionHeaderStyle}>Skills</div>
              {SKILLS.map(([skill, ability]) => {
                const val = abilityMap[ability];
                const isProficient = (character.skillProficiencies ?? []).includes(skill);
                const skillMod = abilityMod(val) + (isProficient ? profBonus : 0);
                return (
                  <DndTooltip key={skill} text={`${ability}: ${SKILL_TOOLTIPS[skill]}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "2px 0" }}>
                      <ProfDot filled={isProficient} />
                      <span style={{ fontFamily: "monospace", width: 24, textAlign: "right", fontWeight: 600, color: C.parchment }}>{fmtMod(skillMod)}</span>
                      <span style={{ color: isProficient ? C.parchment : C.goldMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {skill} <span style={{ fontSize: 9, color: C.goldMuted }}>({ability})</span>
                      </span>
                    </div>
                  </DndTooltip>
                );
              })}
            </div>

            {/* Quest Log */}
            {questLog.length > 0 && (
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Quest Log</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-1">
                  {questLog.map((q) => (
                    <li key={q} style={{ fontSize: 11, color: C.gold }}>
                      &#x2694; {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unconscious warning */}
            {character.isUnconscious && (
              <div style={{ background: "rgba(139,0,0,0.3)", borderRadius: 8, padding: 12, border: `1px solid ${C.crimsonBorder}` }} className="animate-pulse">
                <div style={{ fontSize: 10, color: "#dc2626", fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", fontWeight: 700, textAlign: "center" }}>
                  Unconscious
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Karma History sub-modal */}
        {showKarmaHistory && (
          <KarmaHistory
            karma={character.karma}
            history={karmaHistory}
            onClose={() => setShowKarmaHistory(false)}
          />
        )}

        {/* Fame History sub-modal */}
        {showFameHistory && (
          <FameHistory
            fame={character.fame}
            history={fameHistory}
            onClose={() => setShowFameHistory(false)}
          />
        )}
      </div>
    </div>
  );
}
