/**
 * D&D 5e Rules Reference Database — plain English explanations for player questions.
 *
 * Each entry has a category, trigger keywords, and a clear direct answer
 * as a DM would explain to a player at the table.
 */

export interface RulesEntry {
  category: string;
  keywords: string[];
  title: string;
  answer: string;
}

export const RULES_DATABASE: RulesEntry[] = [
  // ── Combat Actions ─────────────────────────────────────────────

  {
    category: "combat_action",
    keywords: ["attack action", "attack", "melee attack", "weapon attack"],
    title: "Attack Action",
    answer: "On your turn you can use your action to make one melee or ranged weapon attack. Roll a d20, add your ability modifier and proficiency bonus. If the total meets or exceeds the target's AC, you hit. Roll your weapon's damage dice plus your ability modifier for damage. At level 5, Fighters, Paladins, Rangers, Monks, and Barbarians get Extra Attack — two attacks per Attack action.",
  },
  {
    category: "combat_action",
    keywords: ["bonus action", "bonus"],
    title: "Bonus Action",
    answer: "A bonus action is a special extra action you can take on your turn, but only if a feature or spell specifically says it uses a bonus action. You only get one bonus action per turn. Examples: Rogue Cunning Action, offhand attack with two-weapon fighting, casting Healing Word, Monk Ki abilities. You choose when during your turn to use it.",
  },
  {
    category: "combat_action",
    keywords: ["reaction", "reactions"],
    title: "Reaction",
    answer: "A reaction is a special response triggered by something specific, like an enemy moving away from you. You get one reaction per round — it resets at the start of your next turn. The most common reaction is an Opportunity Attack. Spells like Shield and Counterspell also use your reaction.",
  },
  {
    category: "combat_action",
    keywords: ["opportunity attack", "opportunity attacks", "attack of opportunity"],
    title: "Opportunity Attack",
    answer: "When a creature you can see moves out of your melee reach, you can use your reaction to make one melee attack against it. This costs your reaction for the round. The Disengage action prevents opportunity attacks. Teleportation and forced movement (being pushed or thrown) do not trigger opportunity attacks.",
  },
  {
    category: "combat_action",
    keywords: ["disengage"],
    title: "Disengage",
    answer: "The Disengage action lets you move away from enemies without provoking opportunity attacks for the rest of your turn. It uses your full action — you cannot also attack (unless you have Extra Attack or a feature like Cunning Action). Rogues can Disengage as a bonus action via Cunning Action.",
  },
  {
    category: "combat_action",
    keywords: ["dodge", "dodge action"],
    title: "Dodge",
    answer: "The Dodge action makes you harder to hit until your next turn. Any attack roll against you has disadvantage (rolls twice, takes the lower), and you make DEX saving throws with advantage (roll twice, take the higher). You lose this benefit if you are incapacitated or your speed drops to 0.",
  },
  {
    category: "combat_action",
    keywords: ["dash", "dash action"],
    title: "Dash",
    answer: "The Dash action doubles your movement for the turn. If your speed is 30 feet, you can move 60 feet total. It uses your full action. Rogues can Dash as a bonus action via Cunning Action. Monks can use Step of the Wind (1 Ki point) to Dash as a bonus action.",
  },
  {
    category: "combat_action",
    keywords: ["ready", "ready action", "readied action", "held action"],
    title: "Ready Action",
    answer: "You can Ready an action by stating a trigger and what you will do when it happens. For example: 'I Ready my attack for when the goblin steps into the doorway.' When the trigger occurs, you use your reaction to take the readied action. If you Ready a spell, you must concentrate on it and use the spell slot when you Ready it, even if the trigger never occurs.",
  },
  {
    category: "combat_action",
    keywords: ["help", "help action"],
    title: "Help Action",
    answer: "The Help action gives an ally advantage on their next ability check or attack roll against a target within 5 feet of you. You must use it before the ally makes the roll. It uses your action for the turn.",
  },
  {
    category: "combat_action",
    keywords: ["grapple", "grappling"],
    title: "Grapple",
    answer: "To grapple, use your Attack action to make a contested Athletics check vs the target's Athletics or Acrobatics (target chooses). On success, the target's speed becomes 0. The target can use its action to try to escape (same contested check). You need a free hand to grapple. Moving a grappled creature costs double movement. The grapple ends if you are incapacitated or the target is moved out of reach.",
  },
  {
    category: "combat_action",
    keywords: ["shove", "shoving"],
    title: "Shove",
    answer: "Shoving uses your Attack action. Make a contested Athletics check vs the target's Athletics or Acrobatics. On success, you choose to either knock them prone or push them 5 feet away. The target must be no more than one size larger than you.",
  },
  {
    category: "combat_action",
    keywords: ["two-weapon fighting", "two weapon fighting", "dual wield", "dual wielding", "offhand attack", "offhand"],
    title: "Two-Weapon Fighting",
    answer: "If you attack with a light melee weapon in one hand, you can use a bonus action to attack with a different light weapon in the other hand. You don't add your ability modifier to the damage of the bonus attack (unless the modifier is negative). The Two-Weapon Fighting fighting style lets you add the modifier to the offhand damage.",
  },
  {
    category: "combat_action",
    keywords: ["object interaction", "free action", "draw weapon", "open door"],
    title: "Object Interaction",
    answer: "You get one free object interaction per turn — drawing or sheathing a weapon, opening a door, picking up a dropped item, pulling a lever. Anything beyond the first interaction requires your action. Dropping an item is free and doesn't count as your object interaction.",
  },

  // ── Combat Mechanics ───────────────────────────────────────────

  {
    category: "combat_mechanic",
    keywords: ["initiative", "initiative order", "turn order"],
    title: "Initiative",
    answer: "At the start of combat, everyone rolls initiative: d20 + DEX modifier. Higher results go first. Ties go to whoever has the higher DEX score (or roll off). Your initiative stays the same for the entire combat. On your turn you can move, take an action, and optionally a bonus action in any order.",
  },
  {
    category: "combat_mechanic",
    keywords: ["surprise", "surprise round", "ambush"],
    title: "Surprise",
    answer: "If one side catches the other off guard, surprised creatures cannot move or take actions on the first turn of combat, and they cannot use reactions until that turn ends. To determine surprise, the DM compares the ambusher's Stealth checks against each target's passive Perception. After the surprise turn, combat continues normally.",
  },
  {
    category: "combat_mechanic",
    keywords: ["advantage", "disadvantage", "adv", "disadv"],
    title: "Advantage and Disadvantage",
    answer: "Advantage means you roll two d20s and take the higher result. Disadvantage means you roll two d20s and take the lower. They don't stack — multiple sources of advantage still equal one advantage. If you have both advantage and disadvantage from any source, they cancel out and you roll normally. Common sources of advantage: attacking a prone target in melee, attacking an unseen target, Reckless Attack. Common sources of disadvantage: attacking while prone, ranged attack at long range, being poisoned.",
  },
  {
    category: "combat_mechanic",
    keywords: ["critical hit", "critical", "crit", "natural 20", "nat 20"],
    title: "Critical Hits",
    answer: "A natural 20 on an attack roll is a critical hit — it always hits regardless of AC. On a crit, roll all the attack's damage dice twice and add them together, then add your modifier once. For example, 1d8+3 becomes 2d8+3 on a crit. Sneak Attack dice, Divine Smite dice, and other bonus dice are also doubled. A natural 1 always misses regardless of bonuses.",
  },
  {
    category: "combat_mechanic",
    keywords: ["death saving throw", "death save", "death saves", "dying", "down to 0", "zero hp", "0 hp"],
    title: "Death Saving Throws",
    answer: "When you drop to 0 HP, you fall unconscious and start making death saving throws at the start of each turn. Roll a d20 with no modifiers. 10 or higher is a success, below 10 is a failure. Three successes: you stabilize at 0 HP. Three failures: you die. Natural 20: you regain 1 HP and wake up. Natural 1: counts as two failures. Taking damage while at 0 HP counts as one failure (or two failures if it's a crit).",
  },
  {
    category: "combat_mechanic",
    keywords: ["concentration", "concentrating", "concentrate"],
    title: "Concentration",
    answer: "Some spells require concentration to maintain (marked with 'Concentration' in the duration). You can only concentrate on one spell at a time — casting a new concentration spell ends the previous one. If you take damage, make a CON save (DC equals 10 or half the damage taken, whichever is higher). On failure, you lose concentration. Being incapacitated or killed also breaks concentration.",
  },
  {
    category: "combat_mechanic",
    keywords: ["multiattack", "multi attack", "multiple attacks", "extra attack"],
    title: "Multiattack / Extra Attack",
    answer: "Extra Attack lets you attack twice (instead of once) when you take the Attack action on your turn. Fighters, Paladins, Rangers, Barbarians, and Monks get this at level 5. Fighters get a third attack at level 11 and a fourth at level 20. Monsters with Multiattack make a specific number of attacks listed in their stat block. Bonus action attacks (like offhand or Martial Arts) are separate and don't count toward Extra Attack.",
  },
  {
    category: "combat_mechanic",
    keywords: ["cover", "half cover", "three-quarters cover", "full cover", "three quarters"],
    title: "Cover",
    answer: "Half cover (low wall, another creature): +2 to AC and DEX saves. Three-quarters cover (portcullis, arrow slit): +5 to AC and DEX saves. Full cover (completely concealed): cannot be targeted directly. The DM determines what provides what level of cover. You can't shoot through full cover.",
  },

  // ── Conditions ─────────────────────────────────────────────────

  {
    category: "condition",
    keywords: ["blinded", "blind", "blindness"],
    title: "Blinded",
    answer: "A blinded creature can't see and automatically fails any ability check requiring sight. Attack rolls against a blinded creature have advantage. The blinded creature's attack rolls have disadvantage.",
  },
  {
    category: "condition",
    keywords: ["charmed", "charm", "charmed condition"],
    title: "Charmed",
    answer: "A charmed creature can't attack the charmer or target them with harmful abilities or spells. The charmer has advantage on social checks (Persuasion, Deception, etc.) against the charmed creature.",
  },
  {
    category: "condition",
    keywords: ["deafened", "deaf", "deafness"],
    title: "Deafened",
    answer: "A deafened creature can't hear and automatically fails any ability check requiring hearing. This doesn't prevent spellcasting unless the spell has verbal components AND requires you to hear something specific.",
  },
  {
    category: "condition",
    keywords: ["exhaustion", "exhausted", "levels of exhaustion"],
    title: "Exhaustion",
    answer: "Exhaustion has 6 levels that stack. Level 1: disadvantage on ability checks. Level 2: speed halved. Level 3: disadvantage on attacks and saves. Level 4: HP maximum halved. Level 5: speed reduced to 0. Level 6: death. Each level adds to the previous ones. A long rest reduces exhaustion by one level (if you have food and water).",
  },
  {
    category: "condition",
    keywords: ["frightened", "fear", "scared", "afraid"],
    title: "Frightened",
    answer: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.",
  },
  {
    category: "condition",
    keywords: ["grappled", "grapple condition"],
    title: "Grappled (Condition)",
    answer: "A grappled creature's speed becomes 0 and it can't benefit from any bonus to speed. The condition ends if the grappler is incapacitated or the grappled creature is moved out of the grappler's reach by an effect.",
  },
  {
    category: "condition",
    keywords: ["incapacitated"],
    title: "Incapacitated",
    answer: "An incapacitated creature can't take actions or reactions. That's it — it can still move and speak (unless another condition prevents that). Many other conditions (stunned, paralyzed, unconscious) include incapacitated as part of their effects.",
  },
  {
    category: "condition",
    keywords: ["invisible", "invisibility"],
    title: "Invisible",
    answer: "An invisible creature is impossible to see without magic or a special sense. For purposes of hiding, the creature is heavily obscured. Attack rolls against the creature have disadvantage. The creature's attack rolls have advantage. The creature can still be detected by noise, tracks, or other indirect means.",
  },
  {
    category: "condition",
    keywords: ["paralyzed", "paralysis", "paralyze"],
    title: "Paralyzed",
    answer: "A paralyzed creature is incapacitated (can't take actions or reactions) and can't move or speak. It automatically fails STR and DEX saving throws. Attack rolls against it have advantage. Any melee attack that hits within 5 feet is automatically a critical hit.",
  },
  {
    category: "condition",
    keywords: ["petrified", "petrification", "turned to stone"],
    title: "Petrified",
    answer: "A petrified creature is transformed into a solid inanimate substance (usually stone). Its weight increases by a factor of ten. It is incapacitated, can't move or speak, and is unaware of its surroundings. It automatically fails STR and DEX saves. Attack rolls against it have advantage. It has resistance to all damage and is immune to poison and disease.",
  },
  {
    category: "condition",
    keywords: ["poisoned", "poison", "poisoned condition"],
    title: "Poisoned",
    answer: "A poisoned creature has disadvantage on attack rolls and ability checks. That's the entire mechanical effect — simple but significant since it affects nearly everything you do.",
  },
  {
    category: "condition",
    keywords: ["prone", "knocked prone", "fall prone", "lying down"],
    title: "Prone",
    answer: "A prone creature's only movement option is to crawl (half speed) or stand up, which costs half your movement. Melee attacks against a prone creature have advantage if the attacker is within 5 feet. Ranged attacks against a prone creature have disadvantage. The prone creature has disadvantage on attack rolls.",
  },
  {
    category: "condition",
    keywords: ["restrained", "restrain"],
    title: "Restrained",
    answer: "A restrained creature's speed becomes 0 and it can't benefit from any bonus to speed. Attack rolls against it have advantage. The creature has disadvantage on attack rolls and DEX saving throws.",
  },
  {
    category: "condition",
    keywords: ["stunned", "stun", "stunning"],
    title: "Stunned",
    answer: "A stunned creature is incapacitated (can't take actions or reactions), can't move, and can speak only falteringly. It automatically fails STR and DEX saving throws. Attack rolls against it have advantage.",
  },
  {
    category: "condition",
    keywords: ["unconscious", "unconsciousness", "knocked out", "knocked unconscious"],
    title: "Unconscious",
    answer: "An unconscious creature is incapacitated, can't move or speak, is unaware of its surroundings, drops whatever it's holding, and falls prone. It automatically fails STR and DEX saves. Attack rolls against it have advantage. Any hit from within 5 feet is a critical hit.",
  },

  // ── Ability Scores ─────────────────────────────────────────────

  {
    category: "ability_score",
    keywords: ["strength", "str", "strength score"],
    title: "Strength",
    answer: "Strength measures physical power. It affects melee attack rolls and damage with most weapons, Athletics checks (climbing, swimming, jumping, grappling), STR saving throws (resisting being pushed or restrained), carrying capacity (STR × 15 pounds), and push/drag/lift limits (STR × 30 pounds).",
  },
  {
    category: "ability_score",
    keywords: ["dexterity", "dex", "dexterity score"],
    title: "Dexterity",
    answer: "Dexterity measures agility and reflexes. It affects ranged attack rolls and damage, finesse weapon attacks (you can choose DEX instead of STR), AC (if wearing light armor or no armor), initiative, DEX saving throws (dodging fireballs, traps), and skills like Acrobatics, Sleight of Hand, and Stealth.",
  },
  {
    category: "ability_score",
    keywords: ["constitution", "con", "constitution score"],
    title: "Constitution",
    answer: "Constitution measures health and stamina. It affects your HP (CON modifier added to each Hit Die), CON saving throws (concentration checks, resisting poison), and your ability to endure hardship. There are no skills tied to Constitution. Every class benefits from high CON since it directly increases HP at every level.",
  },
  {
    category: "ability_score",
    keywords: ["intelligence", "int", "intelligence score"],
    title: "Intelligence",
    answer: "Intelligence measures reasoning and memory. It's the spellcasting ability for Wizards. It affects Investigation, Arcana, History, Nature, Religion checks, and INT saving throws (resisting mental illusions). Wizards add their INT modifier to spell attack rolls and spell save DCs.",
  },
  {
    category: "ability_score",
    keywords: ["wisdom", "wis", "wisdom score"],
    title: "Wisdom",
    answer: "Wisdom measures perception, intuition, and willpower. It's the spellcasting ability for Clerics, Druids, and Rangers. It affects Perception, Insight, Survival, Medicine, Animal Handling checks, passive Perception (10 + WIS modifier + proficiency if proficient), and WIS saving throws (resisting charm, fear, mind control).",
  },
  {
    category: "ability_score",
    keywords: ["charisma", "cha", "charisma score"],
    title: "Charisma",
    answer: "Charisma measures force of personality and social influence. It's the spellcasting ability for Bards, Sorcerers, Warlocks, and Paladins. It affects Persuasion, Deception, Intimidation, Performance checks, and CHA saving throws (resisting banishment and similar effects).",
  },

  // ── Skills ─────────────────────────────────────────────────────

  {
    category: "skill",
    keywords: ["acrobatics"],
    title: "Acrobatics (DEX)",
    answer: "Acrobatics (Dexterity) covers balance, tumbling, and aerial maneuvers. Use it to stay on your feet on slippery ice, balance on a tightrope, or perform stunts while falling. It's also used to escape grapples as an alternative to Athletics.",
  },
  {
    category: "skill",
    keywords: ["animal handling"],
    title: "Animal Handling (WIS)",
    answer: "Animal Handling (Wisdom) covers calming a domesticated animal, keeping a mount from being spooked, intuiting an animal's intentions, or controlling a mount during a risky maneuver.",
  },
  {
    category: "skill",
    keywords: ["arcana"],
    title: "Arcana (INT)",
    answer: "Arcana (Intelligence) measures your knowledge of spells, magic items, magical traditions, the planes of existence, and the inhabitants of those planes. Use it to identify a spell being cast, recall lore about magical phenomena, or recognize arcane symbols.",
  },
  {
    category: "skill",
    keywords: ["athletics"],
    title: "Athletics (STR)",
    answer: "Athletics (Strength) covers climbing, jumping, swimming, and any feat of raw physical power. It's the primary skill for grappling and resisting shoves. Use it to climb a slippery cliff, swim against a current, or hold a door shut against something pushing from the other side.",
  },
  {
    category: "skill",
    keywords: ["deception"],
    title: "Deception (CHA)",
    answer: "Deception (Charisma) determines whether you can convincingly conceal the truth — through ambiguity, misleading statements, or outright lies. Use it to fast-talk a guard, con a merchant, maintain a disguise, or keep a straight face while bluffing.",
  },
  {
    category: "skill",
    keywords: ["history"],
    title: "History (INT)",
    answer: "History (Intelligence) measures your ability to recall lore about historical events, legendary people, ancient kingdoms, past disputes, recent wars, and lost civilizations.",
  },
  {
    category: "skill",
    keywords: ["insight"],
    title: "Insight (WIS)",
    answer: "Insight (Wisdom) lets you read body language and speech patterns to determine someone's true intentions. Use it to detect lies, predict someone's next move, or get a gut feeling about whether something is off. It's the counter to Deception.",
  },
  {
    category: "skill",
    keywords: ["intimidation"],
    title: "Intimidation (CHA)",
    answer: "Intimidation (Charisma) is used to influence someone through overt threats, hostile actions, or physical violence. Use it to pry information out of a prisoner, convince street thugs to back off, or leverage the broken edge of a bottle to persuade someone to reconsider.",
  },
  {
    category: "skill",
    keywords: ["investigation"],
    title: "Investigation (INT)",
    answer: "Investigation (Intelligence) is for active searching and deduction. Use it to search for clues, deduce the location of a hidden object, figure out what kind of wound killed a creature, or piece together a puzzle. Perception notices things; Investigation figures them out.",
  },
  {
    category: "skill",
    keywords: ["medicine"],
    title: "Medicine (WIS)",
    answer: "Medicine (Wisdom) lets you stabilize a dying companion (DC 10 check as an action) or diagnose an illness. Stabilizing a creature at 0 HP prevents them from making death saves — they remain unconscious at 0 HP but stable.",
  },
  {
    category: "skill",
    keywords: ["nature"],
    title: "Nature (INT)",
    answer: "Nature (Intelligence) measures your knowledge of terrain, plants, animals, weather, and natural cycles. Use it to identify plants or animals, recall knowledge about natural phenomena, or predict the weather.",
  },
  {
    category: "skill",
    keywords: ["perception"],
    title: "Perception (WIS)",
    answer: "Perception (Wisdom) lets you spot, hear, or otherwise detect the presence of something. It measures your general awareness. Your passive Perception (10 + WIS modifier + proficiency if proficient) determines what you notice without actively searching. Active Perception checks are for deliberately looking or listening for something specific.",
  },
  {
    category: "skill",
    keywords: ["performance"],
    title: "Performance (CHA)",
    answer: "Performance (Charisma) determines how well you can delight an audience with music, dance, acting, storytelling, or some other form of entertainment. Bards use this frequently, but any character can attempt a performance.",
  },
  {
    category: "skill",
    keywords: ["persuasion"],
    title: "Persuasion (CHA)",
    answer: "Persuasion (Charisma) is used to influence someone with tact, social grace, or good nature. Use it to convince a chamberlain to let your party see the king, negotiate peace between warring factions, or inspire a crowd. It's your honest, good-faith social skill.",
  },
  {
    category: "skill",
    keywords: ["religion"],
    title: "Religion (INT)",
    answer: "Religion (Intelligence) measures your knowledge of deities, rites, prayers, religious hierarchies, holy symbols, and the practices of secret cults. Use it to recall lore about a god, identify a religious symbol, or understand a sacred ceremony.",
  },
  {
    category: "skill",
    keywords: ["sleight of hand", "sleight"],
    title: "Sleight of Hand (DEX)",
    answer: "Sleight of Hand (Dexterity) covers manual trickery — pickpocketing, planting something on someone, concealing a handheld object, or any act of legerdemain. Use it to palm a coin, slip something into someone's pocket, or filch a key ring.",
  },
  {
    category: "skill",
    keywords: ["stealth", "stealth check", "hiding"],
    title: "Stealth (DEX)",
    answer: "Stealth (Dexterity) is used to hide from enemies, sneak past guards, slip away unnoticed, or move silently. Your Stealth check is contested by the enemy's passive Perception. Heavy armor gives disadvantage on Stealth checks. You must have cover or be heavily obscured to attempt to hide.",
  },
  {
    category: "skill",
    keywords: ["survival"],
    title: "Survival (WIS)",
    answer: "Survival (Wisdom) covers tracking creatures, navigating in the wilderness, identifying animal signs, predicting the weather, and avoiding natural hazards. Use it to follow tracks, forage for food, or find your way through unfamiliar terrain.",
  },

  // ── Spellcasting ───────────────────────────────────────────────

  {
    category: "spellcasting",
    keywords: ["spell slot", "spell slots", "how many spells", "spell level"],
    title: "Spell Slots",
    answer: "Spell slots are your spellcasting fuel. Each leveled spell costs one slot of that spell level or higher. When you use all your slots, you can't cast leveled spells until you rest. Full casters (Wizard, Cleric, Druid, Bard, Sorcerer) regain all slots on a long rest. Warlocks regain slots on a short rest. A higher-level slot can cast a lower-level spell, often with extra effect (e.g. Cure Wounds at 2nd level heals more). Cantrips are free and unlimited.",
  },
  {
    category: "spellcasting",
    keywords: ["cantrip", "cantrips", "cantrip vs spell"],
    title: "Cantrips vs Leveled Spells",
    answer: "Cantrips are 0-level spells you can cast at will, as many times as you want, without using spell slots. They scale with character level (not class level). Leveled spells (1st through 9th level) require a spell slot to cast. Cantrips like Fire Bolt, Sacred Flame, and Eldritch Blast scale their damage at levels 5, 11, and 17.",
  },
  {
    category: "spellcasting",
    keywords: ["bonus action spell", "bonus action casting", "bonus spell restriction"],
    title: "Bonus Action Spell Restriction",
    answer: "If you cast a spell as a bonus action (like Healing Word or Misty Step), the only other spell you can cast that turn is a cantrip with a casting time of 1 action. You cannot cast two leveled spells in one turn even if one is a bonus action. This is one of the most commonly misunderstood rules.",
  },
  {
    category: "spellcasting",
    keywords: ["spell component", "components", "verbal", "somatic", "material", "spell focus"],
    title: "Spell Components",
    answer: "Verbal (V): you must speak an incantation — impossible while silenced. Somatic (S): you need a free hand to gesture — impossible while both hands are full (unless using a focus in one hand). Material (M): you need specific items, which can be replaced by a spell focus or component pouch unless the material has a gold cost or is consumed by the spell.",
  },
  {
    category: "spellcasting",
    keywords: ["ritual", "ritual casting", "ritual spell"],
    title: "Ritual Casting",
    answer: "Some spells have the Ritual tag, meaning they can be cast without using a spell slot if you add 10 minutes to the casting time. Clerics, Druids, and Bards can ritual cast any prepared/known spell with the Ritual tag. Wizards can ritual cast any ritual spell in their spellbook even if not prepared. Not all classes can ritual cast.",
  },
  {
    category: "spellcasting",
    keywords: ["spell attack", "spell save", "spell dc", "spell save dc", "spell attack roll"],
    title: "Spell Attacks vs Spell Saves",
    answer: "Some spells require a spell attack roll (you roll d20 + spellcasting modifier + proficiency). Others force the target to make a saving throw against your Spell Save DC (8 + proficiency bonus + spellcasting modifier). Attack roll spells can crit on a nat 20. Save spells cannot crit but often deal half damage on a successful save.",
  },

  // ── Class Features ─────────────────────────────────────────────

  {
    category: "class_feature",
    keywords: ["sneak attack", "sneak attack damage", "sneak attack dice"],
    title: "Rogue: Sneak Attack",
    answer: "Once per turn when you hit with a finesse or ranged weapon, you deal extra damage: 1d6 at level 1, plus an additional 1d6 every 2 levels (2d6 at level 3, 3d6 at level 5, etc.). You need either advantage on the attack roll OR an ally within 5 feet of the target (and you don't have disadvantage). Sneak Attack damage dice are doubled on a critical hit.",
  },
  {
    category: "class_feature",
    keywords: ["cunning action"],
    title: "Rogue: Cunning Action",
    answer: "Starting at level 2, you can use a bonus action to Dash, Disengage, or Hide. This frees up your action for attacking while still being able to get in and out of danger safely.",
  },
  {
    category: "class_feature",
    keywords: ["action surge"],
    title: "Fighter: Action Surge",
    answer: "Starting at level 2, you can take one additional action on your turn. This is on top of your regular action and bonus action. You can use it once per short or long rest (twice at level 17). This means a level 5 Fighter can attack four times in one turn: two attacks with the Attack action, then Action Surge for two more.",
  },
  {
    category: "class_feature",
    keywords: ["second wind"],
    title: "Fighter: Second Wind",
    answer: "As a bonus action, you regain HP equal to 1d10 + your Fighter level. You can use this once per short or long rest. It's a reliable self-heal that doesn't require spell slots.",
  },
  {
    category: "class_feature",
    keywords: ["rage", "raging", "barbarian rage"],
    title: "Barbarian: Rage",
    answer: "As a bonus action, you enter a rage that lasts 1 minute (10 rounds). While raging: you have advantage on STR checks and saves, you get +2 bonus damage on STR-based melee attacks (+3 at level 9, +4 at level 16), and you have resistance to bludgeoning, piercing, and slashing damage (half damage). Rage ends early if you are knocked unconscious, your turn ends without attacking or taking damage, or you choose to end it. You cannot cast spells while raging.",
  },
  {
    category: "class_feature",
    keywords: ["reckless attack"],
    title: "Barbarian: Reckless Attack",
    answer: "Starting at level 2, when you make your first attack on your turn, you can choose to attack recklessly. You get advantage on all melee STR attack rolls for the turn, but attack rolls against you also have advantage until your next turn. High risk, high reward — use when you need to hit badly and can afford to take damage.",
  },
  {
    category: "class_feature",
    keywords: ["divine smite", "smite"],
    title: "Paladin: Divine Smite",
    answer: "When you hit a creature with a melee weapon attack, you can expend a spell slot to deal extra radiant damage: 2d8 for a 1st-level slot, plus 1d8 for each slot level above 1st (max 5d8). You deal an extra 1d8 against undead and fiends. You choose to smite AFTER you know the attack hits, making it one of the best 'no-waste' abilities. You can smite on a critical hit and double all the smite dice.",
  },
  {
    category: "class_feature",
    keywords: ["lay on hands"],
    title: "Paladin: Lay on Hands",
    answer: "You have a pool of healing power equal to 5 × your Paladin level. As an action, you can touch a creature and restore any number of HP from this pool. You can also spend 5 points from the pool to cure one disease or neutralize one poison. The pool resets on a long rest.",
  },
  {
    category: "class_feature",
    keywords: ["hunter's mark", "hunters mark"],
    title: "Ranger: Hunter's Mark",
    answer: "Cast as a bonus action, designate a creature you can see. You deal an extra 1d6 damage to the target whenever you hit it with a weapon attack. If the target drops to 0 HP, you can use a bonus action on a subsequent turn to mark a new target without using another spell slot. Requires concentration, lasts up to 1 hour. Higher slots extend duration.",
  },
  {
    category: "class_feature",
    keywords: ["martial arts", "monk unarmed", "unarmed strike monk"],
    title: "Monk: Martial Arts",
    answer: "When you use the Attack action with an unarmed strike or monk weapon, you can make one unarmed strike as a bonus action. Your unarmed strikes and monk weapons use DEX instead of STR (your choice). Your Martial Arts die starts at d4 and increases: d6 at level 5, d8 at level 11, d10 at level 17.",
  },
  {
    category: "class_feature",
    keywords: ["ki", "ki points", "ki point", "flurry of blows", "patient defense", "step of the wind", "stunning strike"],
    title: "Monk: Ki",
    answer: "You have Ki points equal to your Monk level, regained on a short or long rest. Flurry of Blows (1 Ki): after attacking, make two unarmed strikes as a bonus action instead of one. Patient Defense (1 Ki): Dodge as a bonus action. Step of the Wind (1 Ki): Disengage or Dash as a bonus action, and your jump distance is doubled. Stunning Strike (1 Ki, level 5+): when you hit, the target must make a CON save or be stunned until the end of your next turn.",
  },
  {
    category: "class_feature",
    keywords: ["channel divinity", "turn undead"],
    title: "Cleric: Channel Divinity",
    answer: "You get one use of Channel Divinity per short or long rest (two at level 6). All Clerics can Turn Undead: each undead within 30 feet makes a WIS save or flees for 1 minute. Your subclass gives a second option — Life Domain gets Preserve Life (heal multiple creatures), War Domain gets Guided Strike (+10 to one attack roll), etc.",
  },
  {
    category: "class_feature",
    keywords: ["wild shape", "wildshape"],
    title: "Druid: Wild Shape",
    answer: "You can transform into a beast you have seen. At level 2: CR 1/4, no flying or swimming speed. Level 4: CR 1/2, swimming speed allowed. Level 8: CR 1, flying speed allowed. You use the beast's physical stats (STR, DEX, CON) but keep your mental stats (INT, WIS, CHA). When the beast form drops to 0 HP, you revert to your normal form. You can use Wild Shape twice per short or long rest.",
  },
  {
    category: "class_feature",
    keywords: ["bardic inspiration", "inspiration die", "bard inspiration"],
    title: "Bard: Bardic Inspiration",
    answer: "As a bonus action, you give one creature within 60 feet an Inspiration die (d6, increasing to d8 at level 5, d10 at level 10, d12 at level 15). Within 10 minutes, they can add it to one ability check, attack roll, or saving throw. You can use this a number of times equal to your CHA modifier (minimum 1), regained on a long rest (short rest at level 5+).",
  },
  {
    category: "class_feature",
    keywords: ["metamagic", "sorcery points", "sorcery point", "quicken", "twin spell", "subtle spell"],
    title: "Sorcerer: Metamagic",
    answer: "At level 3, you get Sorcery Points (equal to your Sorcerer level) and choose 2 Metamagic options. Quickened Spell (2 points): cast a 1-action spell as a bonus action. Twinned Spell (spell level in points): target two creatures with a single-target spell. Subtle Spell (1 point): cast without verbal or somatic components (can't be counterspelled). Empowered Spell (1 point): reroll up to CHA modifier damage dice. Points recharge on a long rest.",
  },
  {
    category: "class_feature",
    keywords: ["pact magic", "warlock slots", "eldritch invocation", "eldritch invocations"],
    title: "Warlock: Pact Magic",
    answer: "Warlocks have fewer spell slots but regain them on a short rest (not just long rest). You start with 1 slot, getting 2 at level 2, 3 at level 11, and 4 at level 17. All your slots are the same level (1st at level 1, up to 5th at level 9). Eldritch Invocations are passive abilities you pick as you level — Agonizing Blast adds CHA modifier to Eldritch Blast damage, Devil's Sight lets you see in magical darkness, etc.",
  },
  {
    category: "class_feature",
    keywords: ["arcane recovery"],
    title: "Wizard: Arcane Recovery",
    answer: "Once per day during a short rest, you can recover spell slots with a combined level equal to half your Wizard level (rounded up). You can't recover slots of 6th level or higher. For example, a level 4 Wizard can recover one 2nd-level slot, or two 1st-level slots.",
  },

  // ── Resting ────────────────────────────────────────────────────

  {
    category: "resting",
    keywords: ["short rest", "short rest benefits", "hit dice spending"],
    title: "Short Rest",
    answer: "A short rest is at least 1 hour of downtime — light activity like eating, reading, or tending wounds. During a short rest, you can spend Hit Dice to regain HP. Roll each Hit Die + your CON modifier. You have a number of Hit Dice equal to your level. You regain half your total Hit Dice (rounded up) after a long rest. Warlock spell slots, Fighter Action Surge, and many other abilities also recharge on a short rest.",
  },
  {
    category: "resting",
    keywords: ["long rest", "long rest benefits", "full rest"],
    title: "Long Rest",
    answer: "A long rest is at least 8 hours, of which 6 must be sleeping (elves: 4 hours of trance). You regain all HP, all spell slots, half your total Hit Dice (rounded up), and most per-long-rest abilities. You can only benefit from one long rest per 24 hours. If the rest is interrupted by combat or strenuous activity for more than 1 hour, you must restart.",
  },
  {
    category: "resting",
    keywords: ["hit dice", "hit die", "spending hit dice"],
    title: "Hit Dice",
    answer: "Each class has a Hit Die (d6 for Wizard/Sorcerer, d8 for most, d10 for Fighter/Paladin/Ranger, d12 for Barbarian). You have one Hit Die per level. During a short rest, you can roll any number of your remaining Hit Dice + CON modifier to regain HP. You recover half your total Hit Dice (minimum 1) after a long rest.",
  },

  // ── Movement ───────────────────────────────────────────────────

  {
    category: "movement",
    keywords: ["movement", "movement speed", "how far can i move", "speed"],
    title: "Movement",
    answer: "Most races have a base walking speed of 30 feet (25 for dwarves, gnomes, halflings). On your turn you can move up to your speed. You can break up movement before, after, or between actions. Moving through an ally's space is allowed but you can't stop there. Moving through an enemy's space costs double movement. Standing up from prone costs half your movement.",
  },
  {
    category: "movement",
    keywords: ["difficult terrain"],
    title: "Difficult Terrain",
    answer: "Difficult terrain (rubble, undergrowth, steep stairs, mud, shallow water) costs 1 extra foot of movement for every foot you move. So 30 feet of speed means you can move 15 feet through difficult terrain. This stacks with other movement costs like crawling.",
  },
  {
    category: "movement",
    keywords: ["jumping", "jump", "long jump", "high jump"],
    title: "Jumping",
    answer: "Long jump (with 10-foot running start): you cover a number of feet equal to your STR score. Without a running start, half that. High jump (with running start): you leap a number of feet equal to 3 + your STR modifier. Without a running start, half that. Jumping costs movement — a character with 30 speed and 15 STR can long-jump 15 feet and still move 15 feet.",
  },
  {
    category: "movement",
    keywords: ["climbing", "swimming", "climb", "swim"],
    title: "Climbing and Swimming",
    answer: "Climbing and swimming each cost 1 extra foot of movement for every foot moved (like difficult terrain). If you have a climb speed or swim speed, you move at that speed without the extra cost. Difficult climbing conditions (slippery wall, rough water) may require an Athletics check.",
  },

  // ── Equipment ──────────────────────────────────────────────────

  {
    category: "equipment",
    keywords: ["finesse", "finesse weapon"],
    title: "Finesse Weapons",
    answer: "Finesse weapons (rapier, shortsword, scimitar, dagger, whip) let you choose to use either STR or DEX for attack and damage rolls. You must use the same modifier for both. This is what makes them ideal for Rogues and DEX-based fighters.",
  },
  {
    category: "equipment",
    keywords: ["versatile", "versatile weapon"],
    title: "Versatile Weapons",
    answer: "Versatile weapons (longsword, battleaxe, warhammer, quarterstaff, spear) can be used with one or two hands. The damage die increases when used two-handed (e.g. longsword: 1d8 one-handed, 1d10 two-handed). You can switch grip freely — no action required.",
  },
  {
    category: "equipment",
    keywords: ["two-handed", "two handed", "two-handed weapon"],
    title: "Two-Handed Weapons",
    answer: "Two-handed weapons (greatsword, greataxe, maul, heavy crossbow, longbow) require both hands to attack with. You can still hold the weapon in one hand when not attacking (to open doors, etc.). You cannot use a shield with a two-handed weapon.",
  },
  {
    category: "equipment",
    keywords: ["light weapon", "light property"],
    title: "Light Weapons",
    answer: "Light weapons (handaxe, dagger, shortsword, scimitar, light hammer, sickle, club) are small and easy to wield in one hand. The Light property is required for two-weapon fighting — both weapons must be Light to use the bonus action offhand attack.",
  },
  {
    category: "equipment",
    keywords: ["thrown", "thrown weapon", "throwing"],
    title: "Thrown Weapons",
    answer: "Thrown weapons (handaxe, javelin, dagger, spear, dart, light hammer, trident, net) can be thrown for a ranged attack. You use STR for the attack and damage roll (DEX if the weapon also has Finesse). The normal and long range are listed in the weapon's entry.",
  },
  {
    category: "equipment",
    keywords: ["reach", "reach weapon"],
    title: "Reach Weapons",
    answer: "Reach weapons (glaive, halberd, lance, pike, whip) add 5 feet to your melee reach. You can attack creatures 10 feet away instead of just 5. This also extends the range of opportunity attacks. A lance has Reach but has disadvantage against targets within 5 feet.",
  },
  {
    category: "equipment",
    keywords: ["heavy weapon", "heavy property"],
    title: "Heavy Weapons",
    answer: "Heavy weapons (greataxe, greatsword, maul, heavy crossbow, longbow, pike, halberd, glaive, lance) are large and unwieldy. Small creatures (halflings, gnomes) have disadvantage on attack rolls with Heavy weapons.",
  },
  {
    category: "equipment",
    keywords: ["loading", "loading property"],
    title: "Loading Weapons",
    answer: "Loading weapons (crossbows, blowgun) require time to reload. You can fire only one piece of ammunition per action, bonus action, or reaction, regardless of the number of attacks you have. The Crossbow Expert feat removes this limitation.",
  },
  {
    category: "equipment",
    keywords: ["armor type", "light armor", "medium armor", "heavy armor", "armor stealth"],
    title: "Armor Types",
    answer: "Light armor (leather, studded leather): add full DEX modifier to AC, no Stealth penalty. Medium armor (chain shirt, breastplate, half plate): add DEX modifier to AC (max +2), half plate imposes Stealth disadvantage. Heavy armor (ring mail, chain mail, splint, plate): no DEX bonus, requires STR 13-15, most impose Stealth disadvantage. Plate (AC 18) is the best armor but gives Stealth disadvantage and requires STR 15.",
  },
  {
    category: "equipment",
    keywords: ["shield", "shields"],
    title: "Shields",
    answer: "A shield gives +2 AC while held in one hand. Donning a shield takes an action; doffing takes an action. You can't use a two-handed weapon with a shield. Clerics, Fighters, Paladins, Rangers, and Druids are proficient with shields.",
  },
];
