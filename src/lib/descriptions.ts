/**
 * Beginner-friendly descriptions for D&D concepts.
 * Written in plain language for players unfamiliar with D&D.
 */

/** Plain-language explanations for each ability score */
export const ABILITY_DESCRIPTIONS: Record<string, { short: string; long: string }> = {
  strength: {
    short: "Physical power",
    long: "Affects melee attacks, how much you can carry, and physical feats like breaking down doors or climbing walls.",
  },
  dexterity: {
    short: "Agility & reflexes",
    long: "Affects ranged attacks, how hard you are to hit, sneaking, acrobatics, and dodging traps.",
  },
  constitution: {
    short: "Toughness & endurance",
    long: "Determines your hit points (health). Higher CON means you can take more damage before going down.",
  },
  wisdom: {
    short: "Awareness & intuition",
    long: "Affects your perception, insight into others' motives, survival instincts, and healing magic.",
  },
  intelligence: {
    short: "Knowledge & reasoning",
    long: "Affects arcane magic, investigation, history knowledge, and how quickly you figure things out.",
  },
  charisma: {
    short: "Force of personality",
    long: "Affects persuasion, deception, intimidation, and powers fueled by willpower or charm.",
  },
};

/** Plain-language explanations for skill proficiencies */
export const SKILL_DESCRIPTIONS: Record<string, string> = {
  Acrobatics: "Flips, balance, and tumbling — useful for dodging and escaping.",
  "Animal Handling": "Calming, training, or riding animals.",
  Arcana: "Knowledge of magic, spells, and magical creatures.",
  Athletics: "Climbing, jumping, swimming — raw physical ability.",
  Deception: "Lying convincingly and disguising your true intentions.",
  History: "Recalling lore about events, people, and civilizations.",
  Insight: "Reading people — detecting lies and hidden motives.",
  Intimidation: "Threatening others to get what you want.",
  Investigation: "Finding clues, searching rooms, and solving puzzles.",
  Medicine: "Stabilizing the dying and diagnosing ailments.",
  Nature: "Knowledge of plants, animals, weather, and natural cycles.",
  Perception: "Noticing things — spotting hidden enemies, traps, and secrets.",
  Performance: "Entertaining through music, dance, acting, or storytelling.",
  Persuasion: "Convincing others through charm and good arguments.",
  Religion: "Knowledge of gods, rituals, and holy symbols.",
  "Sleight of Hand": "Pickpocketing, lockpicking, and subtle hand tricks.",
  Stealth: "Moving quietly and hiding from enemies.",
  Survival: "Tracking creatures, foraging, and navigating the wilderness.",
};

/** Plain-language explanations for cantrips (at-will minor spells) */
export const CANTRIP_DESCRIPTIONS: Record<string, string> = {
  "Acid Splash": "Hurl a bubble of acid at one or two nearby enemies.",
  "Blade Ward": "Briefly shield yourself, taking half damage from weapons.",
  "Chill Touch": "A ghostly hand deals damage and stops healing.",
  "Dancing Lights": "Create floating lights to illuminate dark areas.",
  Druidcraft: "Minor nature trick — predict weather, bloom a flower, snuff a flame.",
  "Eldritch Blast": "Powerful beam of crackling energy — the warlock's signature attack.",
  "Fire Bolt": "Hurl a ball of fire for solid damage at range.",
  Friends: "Magically charm someone briefly, but they'll know afterward.",
  Guidance: "Touch an ally to boost their next skill check.",
  Light: "Make an object glow brightly for an hour.",
  "Mage Hand": "A spectral floating hand that can manipulate objects at range.",
  Mending: "Repair a small break or tear in an object.",
  Message: "Whisper a message to someone far away — only they hear it.",
  "Minor Illusion": "Create a small illusory sound or image.",
  "Poison Spray": "Spray toxic gas at a nearby creature.",
  Prestidigitation: "Minor magical tricks — light candles, clean clothes, flavor food.",
  "Produce Flame": "Conjure fire in your hand for light or to throw at enemies.",
  "Ray of Frost": "An icy beam that damages and slows an enemy.",
  Resistance: "Touch an ally to boost their next saving throw.",
  "Sacred Flame": "Holy fire strikes a creature — they can't hide behind cover.",
  Shillelagh: "Your wooden weapon becomes magical and uses your Wisdom to attack.",
  "Shocking Grasp": "Lightning damage with your touch — great for escaping melee.",
  "Spare the Dying": "Stabilize a dying ally with a touch.",
  Thaumaturgy: "Minor divine tricks — booming voice, flickering flames, trembling ground.",
  "Thorn Whip": "A thorny vine pulls an enemy closer to you.",
  "True Strike": "Gain insight for advantage on your next attack.",
  "Vicious Mockery": "Your insults deal psychic damage and weaken the target's next attack.",
};

/** Plain-language explanations for 1st-level spells */
export const SPELL_DESCRIPTIONS: Record<string, string> = {
  Alarm: "Set a magical alarm on a door or area — warns you of intruders.",
  "Animal Friendship": "Charm a beast so it won't attack you.",
  "Armor of Agathys": "Gain temporary health that damages attackers with cold.",
  "Arms of Hadar": "Tentacles of dark energy strike all nearby enemies.",
  Bless: "Boost three allies' attacks and saves for the fight.",
  "Burning Hands": "Fan of flames damages everyone in a wide cone.",
  "Charm Person": "Make someone treat you as a friendly acquaintance.",
  "Chromatic Orb": "Hurl an orb of your chosen element for heavy damage.",
  "Color Spray": "A burst of light blinds enemies with low health.",
  Command: "Speak a one-word command that the target must obey.",
  "Comprehend Languages": "Understand any spoken or written language.",
  "Create or Destroy Water": "Conjure or evaporate up to 10 gallons of water.",
  "Cure Wounds": "Heal an ally by touching them.",
  "Detect Evil and Good": "Sense nearby supernatural creatures and consecrated places.",
  "Detect Magic": "Sense the presence of magic within 30 feet.",
  "Detect Poison and Disease": "Identify poisons and diseases nearby.",
  "Disguise Self": "Change your appearance with an illusion.",
  Entangle: "Grasping weeds and vines restrain creatures in an area.",
  "Expeditious Retreat": "Dash as a bonus action each turn — great for running away.",
  "Faerie Fire": "Outline enemies in light — attacks against them have advantage.",
  "False Life": "Gain temporary hit points to absorb some damage.",
  "Feather Fall": "Slow a fall to prevent damage — great for cliffs and pits.",
  "Find Familiar": "Summon a magical animal companion that scouts for you.",
  "Fog Cloud": "Create a thick fog that blocks all sight in an area.",
  Goodberry: "Create 10 magical berries that each heal 1 HP and feed you for a day.",
  Grease: "Cover the ground in slippery grease — enemies fall prone.",
  "Guiding Bolt": "A flash of light deals heavy damage and gives your ally advantage.",
  "Healing Word": "Heal an ally with a spoken word — lets you still act this turn.",
  "Hellish Rebuke": "When hit, blast the attacker with fire as a reaction.",
  Heroism: "An ally becomes immune to fear and gains health each turn.",
  Hex: "Curse a target — your attacks deal extra damage to them.",
  Identify: "Learn all magical properties of an item or creature.",
  "Illusory Script": "Write a secret message only certain people can read.",
  "Inflict Wounds": "A melee touch that deals heavy necrotic damage.",
  Jump: "Triple a creature's jump distance.",
  Longstrider: "Increase a creature's speed for an hour.",
  "Mage Armor": "Set your AC to 13 + DEX — great for unarmored casters.",
  "Magic Missile": "Three glowing darts that always hit — guaranteed damage.",
  "Protection from Evil and Good": "Shield against aberrations, demons, and undead.",
  "Purify Food and Drink": "Remove all poison and disease from food and water.",
  "Ray of Sickness": "A sickly green ray deals poison damage and may nauseate.",
  Sanctuary: "Enemies must resist attacking the protected creature.",
  Shield: "React to boost your AC by 5 — can turn a hit into a miss.",
  "Shield of Faith": "Grant an ally +2 AC for up to 10 minutes.",
  "Silent Image": "Create a visual illusion of any object or creature.",
  Sleep: "Put creatures to sleep based on their remaining health.",
  "Speak with Animals": "Talk to beasts and understand their replies.",
  "Tasha's Hideous Laughter": "A creature falls prone laughing and can't act.",
  Thunderwave: "A wave of force pushes enemies back and deals damage.",
  "Unseen Servant": "An invisible helper that carries things and does simple tasks.",
  "Witch Bolt": "A sustained bolt of lightning that damages each turn.",
};

/** Plain-language explanations for fighting styles */
export const FIGHTING_STYLE_DESCRIPTIONS: Record<string, string> = {
  "Archery (+2 ranged attack)": "You're great with bows — +2 bonus to hit with ranged weapons.",
  "Defense (+1 AC in armor)": "While wearing armor, you're harder to hit (+1 AC).",
  "Dueling (+2 dmg one-handed)": "When fighting with one weapon and no shield in the other hand, deal +2 damage.",
  "Great Weapon Fighting (reroll 1-2 dmg with two-handed)": "With big two-handed weapons, you can reroll low damage dice.",
  "Protection (impose disadvantage on attacks vs adjacent ally)": "Use your shield to protect nearby allies from attacks.",
  "Two-Weapon Fighting (add ability mod to off-hand damage)": "Your off-hand attacks deal full damage when dual-wielding.",
};

/** Beginner-friendly race summaries for card display */
export const RACE_SUMMARIES: Record<string, { tagline: string; playstyle: string }> = {
  Human: {
    tagline: "Versatile & Adaptable",
    playstyle: "Good at everything. A solid, well-rounded choice for any class.",
  },
  Elf: {
    tagline: "Graceful & Perceptive",
    playstyle: "Great for agile characters. Bonus to DEX, can see in the dark, and hard to put to sleep.",
  },
  Dwarf: {
    tagline: "Tough & Resilient",
    playstyle: "Hard to kill. Bonus to CON, resists poison, and excels as a frontline fighter or cleric.",
  },
  Halfling: {
    tagline: "Lucky & Nimble",
    playstyle: "Reroll natural 1s! Great for rogues and anyone who wants a lucky streak.",
  },
  Gnome: {
    tagline: "Clever & Curious",
    playstyle: "Smart and magic-resistant. Great for wizards and anyone who relies on brains.",
  },
  "Half-Elf": {
    tagline: "Charismatic & Flexible",
    playstyle: "Extra skills and a CHA boost. Perfect for bards, paladins, and social characters.",
  },
  "Half-Orc": {
    tagline: "Fierce & Powerful",
    playstyle: "Hits hard and refuses to go down. Great for barbarians and fighters.",
  },
  Tiefling: {
    tagline: "Mysterious & Fiery",
    playstyle: "Fire resistance and innate magic. Great for warlocks, sorcerers, and edgy characters.",
  },
  Dragonborn: {
    tagline: "Proud & Draconic",
    playstyle: "Breathes elemental energy! Great for paladins, fighters, and anyone who wants dragon heritage.",
  },
};

/** Beginner-friendly class summaries for card display */
export const CLASS_SUMMARIES: Record<string, { tagline: string; playstyle: string; difficulty: "Easy" | "Medium" | "Hard" }> = {
  Barbarian: {
    tagline: "Raging Melee Powerhouse",
    playstyle: "Charge in, get angry, hit things really hard. Simple and effective.",
    difficulty: "Easy",
  },
  Bard: {
    tagline: "Musical Jack-of-All-Trades",
    playstyle: "Inspire allies, cast spells, and talk your way out of anything.",
    difficulty: "Medium",
  },
  Cleric: {
    tagline: "Divine Healer & Protector",
    playstyle: "Heal your wounds, smite the undead, and wear heavy armor.",
    difficulty: "Medium",
  },
  Druid: {
    tagline: "Nature's Spellcaster",
    playstyle: "Command the forces of nature with versatile spellcasting.",
    difficulty: "Medium",
  },
  Fighter: {
    tagline: "Master of Weapons & Tactics",
    playstyle: "Reliable, tough, and deadly. Pick a weapon and master it.",
    difficulty: "Easy",
  },
  Monk: {
    tagline: "Martial Arts Master",
    playstyle: "Fast, unarmored combat. Punch, kick, and dodge with supernatural speed.",
    difficulty: "Medium",
  },
  Paladin: {
    tagline: "Holy Warrior",
    playstyle: "Heavy armor, divine magic, and devastating smites. A righteous tank.",
    difficulty: "Easy",
  },
  Ranger: {
    tagline: "Wilderness Hunter",
    playstyle: "Track enemies, explore the wild, and excel with a bow.",
    difficulty: "Medium",
  },
  Rogue: {
    tagline: "Cunning & Deadly",
    playstyle: "Sneak, steal, and strike from the shadows for massive damage.",
    difficulty: "Easy",
  },
  Sorcerer: {
    tagline: "Innate Magical Power",
    playstyle: "Raw magical talent — fewer spells known, but you can supercharge them.",
    difficulty: "Hard",
  },
  Warlock: {
    tagline: "Pact-Powered Caster",
    playstyle: "Made a deal with a powerful entity. Fewer spell slots, but Eldritch Blast never gets old.",
    difficulty: "Medium",
  },
  Wizard: {
    tagline: "Scholarly Spellmaster",
    playstyle: "The largest spell list in the game. Knowledge is power — literally.",
    difficulty: "Hard",
  },
};

/** Random fantasy name parts for Quick Start */
const NAME_PREFIXES = [
  "Ael", "Ash", "Bael", "Bran", "Cor", "Dae", "Eld", "Fen",
  "Gal", "Hael", "Iri", "Jor", "Kal", "Lyr", "Mor", "Nyx",
  "Ori", "Pyr", "Quel", "Rael", "Syl", "Thr", "Uth", "Val",
  "Wren", "Xan", "Ysa", "Zeph",
];

const NAME_SUFFIXES = [
  "an", "ara", "dris", "eon", "fir", "grim", "ia", "ion",
  "kar", "lis", "mir", "nor", "or", "ric", "sha", "thas",
  "us", "ven", "wyn", "zar",
];

export function generateRandomName(): string {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return prefix + suffix;
}
