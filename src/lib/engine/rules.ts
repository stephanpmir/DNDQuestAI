import type { Character } from "@/types/character";
import type { EngineOutcome, WorldEvent } from "@/types/world";
import { abilityCheck, attackRoll, damageRoll, modifier, d20, d20Lucky, d } from "./dice";
import {
  detectKarmaAction,
  checkDivineIntervention,
  getItemAffinity,
  applyKarmaDiminishing,
  karmaRestDrift,
  fameRestDecay,
  scaledCombatFame,
  CRIME_FAME_PENALTY,
  shopPriceModifier,
} from "@/lib/karma";
import { detectCrime } from "@/lib/crimes";
import { getItemInfo, getBuyPrice, getSellPrice, isEquippable, getEquipSlot, getWeaponDamage } from "@/lib/items";
import { consumeResource, findSpellSlot } from "@/lib/resources";
import type { ResourcePool } from "@/lib/resources";

/** Action categories the engine can detect from player input. */
type ActionType =
  | "attack"
  | "cast_spell"
  | "skill_check"
  | "explore"
  | "talk"
  | "rest"
  | "trade"
  | "use_item"
  | "equip_item"
  | "pickup"
  | "drop_item"
  | "second_wind"
  | "breath_weapon"
  | "rage"
  | "bardic_inspiration"
  | "channel_divinity"
  | "wild_shape"
  | "flurry_of_blows"
  | "lay_on_hands"
  | "divine_smite"
  | "identify_item"
  | "self_harm"
  | "death_save"
  | "unknown";

/** Keywords that map to action types — ORDER MATTERS: more specific patterns first */
const ACTION_PATTERNS: [RegExp, ActionType][] = [
  [/\b(second wind)\b/i, "second_wind"],
  [/\b(breath weapon|breathe fire|breathe ice|breathe lightning|breathe acid|breathe poison|use breath|dragon breath)\b/i, "breath_weapon"],
  [/\b(rage|enter rage|go into rage|activate rage|start raging)\b/i, "rage"],
  [/\b(bardic inspiration|inspire|play an inspiring|sing an inspiring|encourage with music)\b/i, "bardic_inspiration"],
  [/\b(channel divinity|turn undead|preserve life|destroy undead|radiance of the dawn)\b/i, "channel_divinity"],
  [/\b(wild shape|shapeshift|shift into|transform into .*(beast|animal|wolf|bear|spider|hawk|cat|rat|panther))\b/i, "wild_shape"],
  [/\b(flurry of blows|ki strike|ki attack|stunning strike|patient defense|step of the wind)\b/i, "flurry_of_blows"],
  [/\b(lay on hands|laying on hands|heal with hands|divine healing touch)\b/i, "lay_on_hands"],
  [/\b(divine smite|smite|holy smite|radiant smite)\b/i, "divine_smite"],
  [/\b(identify|appraise|examine closely|inspect item|study item)\b/i, "identify_item"],
  [/\b(attack|strike|hit|fight|slash|stab|shoot|swing)\b/i, "attack"],
  [/\b(cast|spell|fireball|fire bolt|eldritch blast|magic missile|sacred flame|cure wounds|healing word|goodberry|thunderwave|burning hands|chromatic orb|guiding bolt|inflict wounds|ray of sickness|hellish rebuke|shocking grasp|acid splash|poison spray|vicious mockery|chill touch|ray of frost|thorn whip|produce flame|shillelagh|witch bolt)\b/i, "cast_spell"],
  [/\b(pick lock|sneak|hide|stealth|climb|swim|jump|search|investigate|persuade|intimidate|deceive|perception|check)\b/i, "skill_check"],
  [/\b(rest|sleep|camp|long rest|short rest)\b/i, "rest"],
  [/\b(talk|speak|ask|greet|negotiate|converse|say)\b/i, "talk"],
  [/\b(buy|sell|trade|shop|purchase|barter)\b/i, "trade"],
  [/\b(pick up|grab|take|loot|collect|gather)\b/i, "pickup"],
  [/\b(drop|discard|throw away|leave behind|abandon)\b/i, "drop_item"],
  [/\b(equip|wield|wear|put on|don)\b/i, "equip_item"],
  [/\b(use|drink|eat|open|read)\b/i, "use_item"],
  [/\b(explore|look around|examine|enter|go to|travel|move|walk|head)\b/i, "explore"],
];

/** Patterns that indicate self-harm or dangerous self-targeted actions */
const SELF_HARM_PATTERNS = [
  /\b(?:set (?:myself|me|my) on fire|burn myself|light myself)\b/i,
  /\b(?:drink|consume|ingest)\s+(?:the\s+)?(?:poison|venom|acid|lava)\b/i,
  /\b(?:stab|cut|hurt|harm|attack|hit)\s+(?:myself|me)\b/i,
  /\b(?:jump off|leap off|throw myself|jump into)\s+(?:the\s+)?(?:cliff|lava|fire|pit|void|abyss)\b/i,
];

/** Minimum turns between rests to prevent rest abuse */
const MIN_TURNS_BETWEEN_RESTS = 5;

/** Minimum turns between healing spells to prevent heal-spam bypassing rest cooldown */
const MIN_TURNS_BETWEEN_HEALS = 3;

/** Minimum turns between travel encounters to prevent XP farming via back-and-forth travel */
const MIN_TURNS_BETWEEN_TRAVEL_ENCOUNTERS = 4;

function detectAction(playerInput: string, character: Character): ActionType {
  // If character is unconscious at 0 HP, force death save
  if (character.isUnconscious && character.hp <= 0) {
    return "death_save";
  }

  // Check for self-harm first
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(playerInput)) return "self_harm";
  }

  for (const [pattern, action] of ACTION_PATTERNS) {
    if (pattern.test(playerInput)) {
      // Class-gated actions: if a non-matching class triggers a class-specific action
      // via a common word (e.g. "smite" for non-Paladins), fall through to "attack" instead
      if (action === "divine_smite" && character.class !== "Paladin") continue;
      if (action === "rage" && character.class !== "Barbarian") continue;
      if (action === "flurry_of_blows" && character.class !== "Monk") continue;
      if (action === "bardic_inspiration" && character.class !== "Bard") continue;
      return action;
    }
  }
  return "unknown";
}

/** Map skill keywords to the governing ability score */
function getSkillAbility(input: string): keyof Character["abilityScores"] {
  const lower = input.toLowerCase();
  if (/stealth|sneak|hide|pick lock|sleight|acrobat/i.test(lower)) return "dexterity";
  if (/persuade|deceive|perform|intimidate/i.test(lower)) return "charisma";
  if (/investigate|arcana|history|religion/i.test(lower)) return "intelligence";
  if (/perception|insight|survival|medicine|animal/i.test(lower)) return "wisdom";
  if (/climb|swim|jump|grapple|shove|athletics/i.test(lower)) return "strength";
  return "wisdom";
}

/**
 * D&D 5e proficiency bonus by level.
 * Levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6
 */
function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Scale enemy difficulty based on character level.
 * Returns an object with enemy AC, attack bonus, damage dice, and HP.
 */
function scaledEnemy(characterLevel: number) {
  const prof = proficiencyBonus(characterLevel);
  // Enemy scales with player level but stays beatable
  return {
    ac: 10 + prof,                           // 12 at L1, 13 at L5, 14 at L9, etc.
    attackBonus: prof + 1,                    // +3 at L1, +4 at L5, etc.
    damageDice: { count: 1, sides: 6 },      // 1d6 base
    damageBonus: Math.floor(characterLevel / 4), // +0 at L1, +1 at L4, etc.
  };
}

/**
 * Scale DC based on character level — keeps checks fair at all levels.
 * Base DCs: Easy 8, Medium 12, Hard 15
 */
function levelScaledDC(baseDC: number, characterLevel: number): number {
  // Add half proficiency bonus to keep DCs challenging but fair
  return baseDC + Math.floor(proficiencyBonus(characterLevel) / 2);
}

/**
 * Detect location changes from player input.
 * Only extract the actual destination name, cleaned up.
 */
/** Words that indicate a nearby/indoor destination — not overland travel */
const LOCAL_DESTINATION_KEYWORDS = [
  "inn", "tavern", "shop", "store", "market", "house", "home", "room",
  "door", "building", "tent", "hut", "cabin", "shack", "barn", "stable",
  "church", "temple", "shrine", "chapel", "library", "guild", "hall",
  "castle", "keep", "tower", "dungeon", "cellar", "basement", "attic",
  "upstairs", "downstairs", "inside", "back", "alley", "street", "square",
  "courtyard", "garden", "warehouse", "forge", "smithy", "bakery",
  "apothecary", "armory", "barracks", "jail", "prison", "throne",
];

interface LocationChange {
  destination: string;
  /** True if this is overland/long-distance travel vs entering a nearby place */
  isTravel: boolean;
}

function detectLocationChange(playerInput: string): LocationChange | undefined {
  const travelPatterns = [
    /\b(?:go to|travel to|head to|walk to|move to|return to)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
    /\b(?:go|travel|head|walk|move)\s+(?:into|inside|through)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
  ];
  const localPatterns = [
    /\b(?:enter|visit|step into|go inside|walk inside|go in)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
    /\b(?:enter|go into|step into)\b/i,
  ];

  // Check for explicit "enter/visit" — these are almost always local
  let isLocalVerb = false;
  for (const pattern of localPatterns) {
    if (pattern.test(playerInput)) {
      isLocalVerb = true;
      break;
    }
  }

  const allPatterns = [
    ...travelPatterns,
    /\b(?:enter|visit)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
  ];

  for (const pattern of allPatterns) {
    const match = playerInput.match(pattern);
    if (match?.[1]) {
      const dest = match[1].trim().replace(/\s+/g, " ");
      if (dest.length < 2) continue;
      const destination = dest.charAt(0).toUpperCase() + dest.slice(1);

      // Determine if this is local movement or actual travel
      const destLower = dest.toLowerCase();
      const isLocalDest = LOCAL_DESTINATION_KEYWORDS.some(
        (kw) => destLower.includes(kw)
      );
      const isTravel = !isLocalVerb && !isLocalDest;

      return { destination, isTravel };
    }
  }
  return undefined;
}

/**
 * D&D 5e XP rewards scaled for solo play.
 * Designed so it takes roughly 10-15 combats per level at low levels.
 */
function combatXpReward(characterLevel: number): number {
  const baseXp = [25, 50, 75, 100, 150, 200, 250, 350, 450, 550,
    650, 800, 950, 1100, 1300, 1500, 1700, 2000, 2300, 2600];
  return baseXp[Math.min(characterLevel - 1, 19)];
}

function skillCheckXpReward(characterLevel: number): number {
  return Math.max(5, Math.floor(combatXpReward(characterLevel) / 5));
}

function explorationXpReward(characterLevel: number): number {
  return Math.max(3, Math.floor(combatXpReward(characterLevel) / 10));
}

// ── Classes that can cast spells ──────────────────────────────────

const FULL_CASTERS: string[] = ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"];
const HALF_CASTERS: string[] = ["Paladin", "Ranger"];
const NON_CASTERS: string[] = ["Barbarian", "Fighter", "Monk", "Rogue"];

/** Abilities that require magic — only casters can do these */
const MAGIC_ACTION_PATTERNS: [RegExp, string][] = [
  [/\b(?:summon|conjure|call forth|invoke)\s+(?:a\s+)?(?:creature|beast|demon|angel|elemental|familiar|spirit|griffon|dragon|phoenix|golem|undead|skeleton)/i, "summon a creature"],
  [/\b(?:teleport|plane shift|dimension door|misty step|blink)\b/i, "teleport"],
  [/\b(?:fly|levitate|soar|take flight|take to the air)\b/i, "fly magically"],
  [/\b(?:turn invisible|go invisible|become invisible|vanish|disappear)\b/i, "turn invisible"],
  [/\b(?:transform|polymorph|shapeshift|shape-shift|change form)\b/i, "transform"],
  [/\b(?:create|conjure|summon)\s+(?:a\s+)?(?:wall|barrier|shield|dome|forcefield|force field)\s+(?:of\s+)?(?:fire|ice|stone|force|light|energy)/i, "create a magical barrier"],
  [/\b(?:raise|resurrect|revive)\s+(?:the\s+)?(?:dead|corpse|body|fallen)/i, "raise the dead"],
  [/\b(?:read|detect)\s+(?:minds?|thoughts?)/i, "read minds"],
  [/\b(?:control|dominate|charm|enchant|bewitch)\s+(?:the\s+)?(?:mind|person|creature|monster|NPC|guard|enemy)/i, "control minds"],
  [/\b(?:breathe?\s+(?:fire|ice|lightning|acid|poison))\b/i, "breathe elemental energy"],
  [/\b(?:shoot|blast|hurl|throw)\s+(?:a\s+)?(?:fireball|lightning|ice|acid|energy|magic)/i, "cast offensive magic"],
];

/** Physical impossibilities — no class can do these */
const IMPOSSIBLE_PATTERNS: [RegExp, string][] = [
  [/\b(?:destroy|blow up|level|demolish|annihilate)\s+(?:the\s+)?(?:entire|whole)?\s*(?:city|town|village|kingdom|world|continent|planet|mountain)/i, "destroy a location"],
  [/\b(?:become|turn into|transform into)\s+(?:a\s+)?(?:god|deity|demigod|immortal|all-powerful)/i, "become a god"],
  [/\b(?:instantly|immediately)\s+(?:kill|destroy|defeat|slay)\s+(?:everyone|all|everything|every creature)/i, "instantly kill everything"],
  [/\b(?:time travel|go back in time|reverse time|stop time)\b/i, "manipulate time"],
  [/\b(?:create|build|make)\s+(?:a\s+)?(?:universe|world|dimension|plane of existence)/i, "create a world"],
  [/\b(?:infinite|unlimited|endless)\s+(?:gold|money|wealth|power|health|HP|hit points)/i, "gain infinite resources"],
  [/\b(?:level up|gain.*levels?|become level)\s+(?:to\s+)?\d+/i, "force level up"],
];

/**
 * Validate player actions against D&D 5e rules and physical possibility.
 * Returns a denial object if the action is impossible, null if it's allowed.
 */
function validateAction(
  playerInput: string,
  character: Character,
  _action: ActionType
): { reason: string; attempted: string } | null {
  const lower = playerInput.toLowerCase();
  const cls = character.class;
  const isCaster = FULL_CASTERS.includes(cls) || HALF_CASTERS.includes(cls);

  // Check for absolute impossibilities first
  for (const [pattern, attempted] of IMPOSSIBLE_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        reason: `That action is beyond any mortal's ability. Even the most powerful adventurers cannot ${attempted}.`,
        attempted,
      };
    }
  }

  // Check for magical actions by non-casters
  for (const [pattern, attempted] of MAGIC_ACTION_PATTERNS) {
    if (pattern.test(lower)) {
      // Flying: only allowed with Fly spell (casters level 5+) or racial features
      if (attempted === "fly magically") {
        if (!isCaster) {
          return {
            reason: `As a ${cls}, you have no magical ability to fly. You'd need wings, a flying mount, or magic to take to the air.`,
            attempted: "fly",
          };
        }
        // Casters can fly at level 5+ (Fly is a 3rd-level spell)
        if (character.level < 5) {
          return {
            reason: `You haven't mastered the Fly spell yet. That requires at least 3rd-level spell slots (character level 5+).`,
            attempted: "fly",
          };
        }
        continue; // Allowed for high-level casters
      }

      // Summoning: requires specific spells and level
      if (attempted === "summon a creature") {
        if (!isCaster) {
          return {
            reason: `As a ${cls}, you cannot summon creatures through magic. You'd need to find and befriend an animal through Animal Handling, or hire a companion.`,
            attempted: "summon",
          };
        }
        // Summoning spells are typically 3rd level+ (character level 5+)
        if (character.level < 5) {
          return {
            reason: `You don't yet have the magical power to summon creatures. Summoning spells require at least 3rd-level spell slots (character level 5+).`,
            attempted: "summon",
          };
        }
        continue; // Allowed for high-level casters
      }

      // Teleportation: requires high-level magic
      if (attempted === "teleport") {
        if (!isCaster) {
          return {
            reason: `As a ${cls}, you cannot teleport. That requires powerful magic you don't possess.`,
            attempted: "teleport",
          };
        }
        // Misty Step is 2nd level (level 3+), Dimension Door is 4th level (level 7+), Teleport is 7th level (level 13+)
        if (character.level < 3) {
          return {
            reason: `You haven't mastered teleportation magic yet. The simplest version (Misty Step) requires at least 2nd-level spell slots.`,
            attempted: "teleport",
          };
        }
        continue;
      }

      // General magic actions
      if (NON_CASTERS.includes(cls)) {
        return {
          reason: `As a ${cls}, you don't have the magical ability to ${attempted}. That requires spellcasting which your class doesn't possess.`,
          attempted,
        };
      }

      // Half-casters have limited magic
      if (HALF_CASTERS.includes(cls) && character.level < 2) {
        return {
          reason: `You haven't developed your magical abilities yet. ${cls}s gain spellcasting at level 2.`,
          attempted,
        };
      }
    }
  }

  return null; // Action is allowed
}

/** Travel encounter types scaled by level */
function getRandomTravelEncounter(level: number): { type: "combat" | "social" | "environmental" | "discovery"; description: string } {
  const lowLevelEncounters = [
    { type: "combat" as const, description: "bandits blocking the road" },
    { type: "combat" as const, description: "wolves stalking from the treeline" },
    { type: "combat" as const, description: "a goblin ambush" },
    { type: "social" as const, description: "a traveling merchant with wares" },
    { type: "social" as const, description: "a lost traveler seeking directions" },
    { type: "social" as const, description: "a patrol of town guards" },
    { type: "environmental" as const, description: "a fallen tree blocking the path" },
    { type: "environmental" as const, description: "a sudden rainstorm" },
    { type: "environmental" as const, description: "a rickety bridge over a ravine" },
    { type: "discovery" as const, description: "an abandoned campsite with supplies" },
    { type: "discovery" as const, description: "a strange shrine by the roadside" },
    { type: "discovery" as const, description: "tracks leading off the trail" },
  ];

  const midLevelEncounters = [
    { type: "combat" as const, description: "an ogre demanding a toll" },
    { type: "combat" as const, description: "a wyvern circling overhead" },
    { type: "combat" as const, description: "undead rising from a roadside graveyard" },
    { type: "social" as const, description: "a wounded knight seeking aid" },
    { type: "social" as const, description: "a caravan under attack" },
    { type: "social" as const, description: "a hermit with a cryptic warning" },
    { type: "environmental" as const, description: "a magical fog rolling in" },
    { type: "environmental" as const, description: "an earthquake shaking the ground" },
    { type: "discovery" as const, description: "ruins of an ancient watchtower" },
    { type: "discovery" as const, description: "a hidden cave entrance" },
  ];

  const highLevelEncounters = [
    { type: "combat" as const, description: "a young dragon claiming this territory" },
    { type: "combat" as const, description: "a demon summoned by a shattered ward" },
    { type: "combat" as const, description: "a death knight on a dark steed" },
    { type: "social" as const, description: "a planar traveler from another realm" },
    { type: "social" as const, description: "an ancient spirit bound to a crossroads" },
    { type: "environmental" as const, description: "a rift between planes tearing open" },
    { type: "environmental" as const, description: "a magical storm of wild magic" },
    { type: "discovery" as const, description: "an ancient sealed portal humming with energy" },
    { type: "discovery" as const, description: "the remains of a legendary hero" },
  ];

  const pool = level <= 4 ? lowLevelEncounters
    : level <= 10 ? midLevelEncounters
    : highLevelEncounters;

  return pool[Math.floor(Math.random() * pool.length)];
}

/** Finesse weapons — can use STR or DEX (whichever is higher) */
const FINESSE_WEAPONS = ["rapier", "shortsword", "scimitar", "dagger", "whip"];
/** Ranged weapons — always use DEX */
const RANGED_WEAPONS = ["longbow", "shortbow", "crossbow"];

/**
 * Determine the correct attack ability based on weapon, class, and context.
 * D&D 5e rules: ranged = DEX, finesse = higher of STR/DEX, melee = STR.
 */
function getAttackAbility(
  character: Character,
  playerInput: string,
  isSpell: boolean,
  isRanged: boolean
): keyof Character["abilityScores"] {
  if (isSpell) {
    // Spellcasting ability varies by class
    const cls = character.class;
    if (["Wizard"].includes(cls)) return "intelligence";
    if (["Cleric", "Druid", "Ranger"].includes(cls)) return "wisdom";
    if (["Bard", "Sorcerer", "Warlock", "Paladin"].includes(cls)) return "charisma";
    return "intelligence";
  }

  if (isRanged) return "dexterity";

  // Check equipped weapons for finesse
  const lower = playerInput.toLowerCase();
  const equippedWeapons = character.equipped ?? [];
  const hasFinesse = equippedWeapons.some((w) => FINESSE_WEAPONS.some((f) => w.toLowerCase().includes(f)))
    || FINESSE_WEAPONS.some((f) => lower.includes(f));
  const hasRanged = equippedWeapons.some((w) => RANGED_WEAPONS.some((r) => w.toLowerCase().includes(r)));

  if (hasRanged && !FINESSE_WEAPONS.some((f) => lower.includes(f))) return "dexterity";

  if (hasFinesse) {
    // Use the higher of STR or DEX for finesse weapons
    return character.abilityScores.dexterity >= character.abilityScores.strength
      ? "dexterity" : "strength";
  }

  // Monk Martial Arts: can use DEX instead of STR for unarmed and monk weapons
  if (character.class === "Monk") {
    return character.abilityScores.dexterity >= character.abilityScores.strength
      ? "dexterity" : "strength";
  }

  return "strength";
}

/**
 * Get damage dice for a spell or cantrip based on the spell name and character level.
 * Cantrips scale at levels 5, 11, and 17. Leveled spells use fixed dice.
 */
function getSpellDamageDice(playerInput: string, level: number): { dice: number; sides: number } {
  const lower = playerInput.toLowerCase();
  // Cantrip scaling: 1 die at L1, 2 at L5, 3 at L11, 4 at L17
  const cantripScale = level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;

  // Cantrips
  if (/vicious mockery/i.test(lower)) return { dice: cantripScale, sides: 4 };
  if (/fire bolt/i.test(lower)) return { dice: cantripScale, sides: 10 };
  if (/ray of frost/i.test(lower)) return { dice: cantripScale, sides: 8 };
  if (/sacred flame/i.test(lower)) return { dice: cantripScale, sides: 8 };
  if (/chill touch/i.test(lower)) return { dice: cantripScale, sides: 8 };
  if (/shocking grasp/i.test(lower)) return { dice: cantripScale, sides: 8 };
  if (/acid splash/i.test(lower)) return { dice: cantripScale, sides: 6 };
  if (/poison spray/i.test(lower)) return { dice: cantripScale, sides: 12 };
  if (/eldritch blast/i.test(lower)) return { dice: cantripScale, sides: 10 };
  if (/thorn whip/i.test(lower)) return { dice: cantripScale, sides: 6 };
  if (/produce flame/i.test(lower)) return { dice: cantripScale, sides: 8 };
  if (/shillelagh/i.test(lower)) return { dice: 1, sides: 8 }; // Buffs weapon to 1d8, doesn't scale

  // 1st-level damage spells
  if (/magic missile/i.test(lower)) return { dice: 3, sides: 4 }; // 3d4+3 (auto-hit, no attack roll needed)
  if (/burning hands/i.test(lower)) return { dice: 3, sides: 6 };
  if (/thunderwave/i.test(lower)) return { dice: 2, sides: 8 };
  if (/chromatic orb/i.test(lower)) return { dice: 3, sides: 8 };
  if (/witch bolt/i.test(lower)) return { dice: 1, sides: 12 };
  if (/guiding bolt/i.test(lower)) return { dice: 4, sides: 6 };
  if (/inflict wounds/i.test(lower)) return { dice: 3, sides: 10 };
  if (/ray of sickness/i.test(lower)) return { dice: 2, sides: 8 };
  if (/hellish rebuke/i.test(lower)) return { dice: 2, sides: 10 };

  // Utility/non-damage cantrips — should not deal damage
  const UTILITY_CANTRIPS = /\b(blade ward|dancing lights|friends|light|mage hand|mending|message|minor illusion|prestidigitation|true strike|guidance|resistance|spare the dying|thaumaturgy|druidcraft)\b/i;
  if (UTILITY_CANTRIPS.test(lower)) return { dice: 0, sides: 0 };

  // Default: generic spell damage (2d6)
  return { dice: 2, sides: 6 };
}

/**
 * The Rules Engine. Given a player action and game state, it produces
 * deterministic outcomes. The LLM only narrates what happened.
 */
export function resolveAction(
  playerInput: string,
  character: Character,
  gameState: { location: string; questLog: string[]; turnCount: number },
  recentEvents: WorldEvent[],
  karma?: number
): EngineOutcome {
  const action = detectAction(playerInput, character);
  // Halfling Lucky trait: reroll natural 1s on d20 rolls
  const lucky = character.race === "Halfling";
  // Mutable copy of resource pool for consumption tracking
  let resources: ResourcePool = character.resources
    ? character.resources.map((r) => ({ ...r }))
    : [];
  const outcome: EngineOutcome = {
    hpChange: 0,
    itemsGained: [],
    itemsLost: [],
    goldChange: 0,
    xpGained: 0,
    newNpcs: [],
  };

  // Detect location changes for any action type
  const locationInfo = detectLocationChange(playerInput);
  if (locationInfo) {
    outcome.locationChange = locationInfo.destination;
  }

  // ── Action validation — reject impossible/unrealistic actions ──
  const denial = validateAction(playerInput, character, action);
  if (denial) {
    outcome.actionDenied = denial;
    // Clear location change if the action itself is denied
    if (denial.attempted.includes("fly") || denial.attempted.includes("teleport")) {
      outcome.locationChange = undefined;
    }
    return outcome;
  }

  // ── Unconscious gate — only death saves allowed at 0 HP ──
  // Prevents unconscious characters from trading, exploring, talking, etc.
  if (character.isUnconscious && action !== "death_save") {
    outcome.actionDenied = {
      reason: "You are unconscious and cannot take actions. You must make death saving throws to stabilize.",
      attempted: "act while unconscious",
    };
    return outcome;
  }

  switch (action) {
    case "death_save": {
      // D&D 5e death saving throws — DC 10, no modifiers
      const rolled = lucky ? d20Lucky() : d20();
      const result = {
        type: "save" as const,
        ability: "death",
        dc: 10,
        rolled,
        modifier: 0,
        total: rolled,
        success: rolled >= 10,
        reason: "Death saving throw — clinging to life",
      };
      outcome.roll = result;

      if (rolled === 20) {
        outcome.hpChange = 1;
        outcome.deathSaveResult = "nat20";
      } else if (rolled === 1) {
        outcome.deathSaveResult = "nat1";
      } else if (rolled >= 10) {
        outcome.deathSaveResult = "success";
      } else {
        outcome.deathSaveResult = "failure";
      }
      break;
    }

    case "self_harm": {
      // CON save DC 12 to resist, take 1d6+2 on failure, half on success
      const conSave = abilityCheck(character.abilityScores.constitution, 12, "constitution", 0, lucky);
      outcome.roll = { ...conSave, type: "save", reason: "CON save — resisting self-inflicted harm" };
      const dmg = damageRoll(1, 6, 2);
      if (conSave.success) {
        outcome.hpChange = -Math.max(1, Math.floor(dmg.total / 2));
      } else {
        outcome.hpChange = -dmg.total;
      }
      break;
    }

    case "attack":
    case "cast_spell": {
      const isSpell = action === "cast_spell";

      // ── Healing spell detection: Cure Wounds, Healing Word, Goodberry, etc. ──
      // Note: Lay on Hands is handled separately as a Paladin class feature
      if (isSpell && /\b(cure wounds|healing word|goodberry)\b/i.test(playerInput)) {
        const isCaster = FULL_CASTERS.includes(character.class) || HALF_CASTERS.includes(character.class);
        if (!isCaster) {
          outcome.actionDenied = {
            reason: `As a ${character.class}, you cannot cast healing spells.`,
            attempted: "cast a healing spell",
          };
          break;
        }
        // Healing spell cooldown: prevent heal-spam bypassing rest cooldown
        const turnsSinceLastHeal = (character.lastHealTurn ?? -1) >= 0
          ? gameState.turnCount - (character.lastHealTurn ?? -1)
          : Infinity;
        if (turnsSinceLastHeal < MIN_TURNS_BETWEEN_HEALS) {
          outcome.actionDenied = {
            reason: `You've expended your healing magic recently. You need ${MIN_TURNS_BETWEEN_HEALS - turnsSinceLastHeal} more turn(s) before you can cast another healing spell.`,
            attempted: "cast a healing spell",
          };
          break;
        }
        outcome.lastHealTurn = gameState.turnCount;
        // Goodberry: flat 10 HP healing (10 berries × 1 HP each)
        if (/\bgoodberry\b/i.test(playerInput)) {
          const healed = Math.min(10, character.maxHp - character.hp);
          outcome.hpChange = healed;
          outcome.roll = {
            type: "check",
            ability: "wisdom",
            rolled: 10,
            modifier: 0,
            total: 10,
            dc: 0,
            success: true,
            reason: "Goodberry — 10 magical berries, each restoring 1 HP",
          };
          break;
        }
        // Cure Wounds: 1d8 + spellcasting ability modifier
        // Healing Word: 1d4 + spellcasting ability modifier (bonus action, ranged)
        const isHealingWord = /\bhealing word\b/i.test(playerInput);
        const healDice = isHealingWord ? 4 : 8;
        const spellAbility = ["Wizard"].includes(character.class) ? "intelligence"
          : ["Cleric", "Druid", "Ranger"].includes(character.class) ? "wisdom"
          : "charisma";
        const spellMod = modifier(character.abilityScores[spellAbility as keyof typeof character.abilityScores]);
        const healAmount = damageRoll(1, healDice, spellMod);
        const healed = Math.min(Math.max(1, healAmount.total), character.maxHp - character.hp);
        outcome.hpChange = healed;
        outcome.roll = {
          type: "check",
          ability: spellAbility,
          rolled: healAmount.rolled,
          modifier: spellMod,
          total: healAmount.total,
          dc: 0,
          success: true,
          reason: isHealingWord ? "Healing Word — magical words mend your wounds" : "Cure Wounds — healing energy flows through your hands",
        };
        break;
      }

      // ── Non-caster spell gate ──
      // Non-casters cannot cast ANY spells (damage or utility). This prevents
      // exploits like a Barbarian typing "cast fireball" to deal spell damage.
      if (isSpell) {
        const isCaster = FULL_CASTERS.includes(character.class) || HALF_CASTERS.includes(character.class);
        if (!isCaster) {
          outcome.actionDenied = {
            reason: `As a ${character.class}, you don't have the ability to cast spells. Your class relies on martial prowess, not magic.`,
            attempted: "cast a spell",
          };
          break;
        }
        // Half-casters (Paladin, Ranger) can't cast until level 2
        if (HALF_CASTERS.includes(character.class) && character.level < 2) {
          outcome.actionDenied = {
            reason: `You haven't developed your spellcasting abilities yet. ${character.class}s gain spellcasting at level 2.`,
            attempted: "cast a spell",
          };
          break;
        }
      }

      // ── Spell slot consumption for leveled spells ──
      // Cantrips are free; leveled spells cost a slot
      if (isSpell) {
        const CANTRIP_PATTERN = /\b(fire bolt|ray of frost|sacred flame|chill touch|shocking grasp|acid splash|poison spray|eldritch blast|thorn whip|produce flame|shillelagh|vicious mockery|blade ward|dancing lights|friends|light|mage hand|mending|message|minor illusion|prestidigitation|true strike|guidance|resistance|spare the dying|thaumaturgy|druidcraft)\b/i;
        const isCantrip = CANTRIP_PATTERN.test(playerInput);
        if (!isCantrip) {
          const slotKey = findSpellSlot(resources);
          if (!slotKey) {
            outcome.actionDenied = {
              reason: "You have no spell slots remaining. Cantrips are still available. Spell slots recharge after a rest.",
              attempted: "cast a leveled spell",
            };
            break;
          }
          const consumed = consumeResource(resources, slotKey);
          resources = consumed.pool;
        }
      }

      // ── Utility/non-damage cantrip detection ──
      // These cantrips have no damage component; narrate as flavor, no combat
      if (isSpell) {
        const spellDmg = getSpellDamageDice(playerInput, character.level);
        if (spellDmg.dice === 0) {
          outcome.roll = {
            type: "check",
            ability: "charisma",
            rolled: 0,
            modifier: 0,
            total: 0,
            dc: 0,
            success: true,
            reason: "Utility cantrip — no damage, the DM narrates the magical effect",
          };
          break;
        }
      }

      // ── Magic Missile: auto-hit, no attack roll (D&D 5e PHB p.257) ──
      // Magic Missile always hits — 3d4+3 force damage, no save, no counterattack
      if (isSpell && /\bmagic missile\b/i.test(playerInput)) {
        const dmg = damageRoll(3, 4, 3);
        outcome.roll = {
          type: "attack",
          ability: getAttackAbility(character, playerInput, true, false),
          rolled: 20, // auto-hit, display as guaranteed
          modifier: 0,
          total: 20,
          dc: 0,
          success: true,
          reason: "Magic Missile — darts of magical force unerringly strike the target (auto-hit)",
        };
        outcome.damageDealt = dmg.total;
        outcome.xpGained = combatXpReward(character.level);
        break;
      }

      // D&D 5e attack: d20 + ability modifier + proficiency bonus vs enemy AC
      // Check both player input AND equipped weapons for ranged detection
      const equippedHasRanged = (character.equipped ?? []).some((w) =>
        RANGED_WEAPONS.some((r) => w.toLowerCase().includes(r))
      );
      const inputMentionsRanged = /\b(shoot|longbow|shortbow|crossbow|bow|arrow)\b/i.test(playerInput);
      const inputMentionsMelee = /\b(swing|slash|stab|strike|sword|axe|mace|hammer|club|dagger|shortsword|rapier|melee|punch|kick)\b/i.test(playerInput);
      // Use ranged if explicitly mentioned, or if equipped ranged weapon and not explicitly melee
      const isRanged = inputMentionsRanged || (equippedHasRanged && !inputMentionsMelee);
      const atkAbility = getAttackAbility(character, playerInput, isSpell, isRanged);
      const atkScore = character.abilityScores[atkAbility];
      const atkMod = modifier(atkScore);
      const prof = proficiencyBonus(character.level);

      const enemy = scaledEnemy(character.level);
      let atkBonus = prof;

      // Apply Fighting Style: Archery (+2 ranged WEAPON attack, not spells)
      if (isRanged && !isSpell && character.fightingStyle?.includes("Archery")) {
        atkBonus += 2;
      }

      const hit = attackRoll(atkScore, enemy.ac, atkBonus, lucky);
      outcome.roll = { ...hit, reason: isSpell ? "Spell attack roll" : "Attack roll — striking the enemy" };

      if (hit.success) {
        // Roll damage — critical hit on natural 20 doubles dice
        const isCrit = hit.rolled === 20;
        let baseDiceCount: number;
        let diceSides: number;
        if (isSpell) {
          // Use correct damage dice based on spell/cantrip
          const spellDmg = getSpellDamageDice(playerInput, character.level);
          baseDiceCount = spellDmg.dice;
          diceSides = spellDmg.sides;
        } else {
          // Use actual weapon damage dice from equipped weapon
          const weaponDmg = getWeaponDamage(character.equipped ?? []);
          baseDiceCount = weaponDmg.dice;
          diceSides = weaponDmg.sides;

          // Monk Martial Arts: unarmed strikes or monk weapons use Martial Arts die if higher
          if (character.class === "Monk") {
            const martialArtsDie = character.level >= 17 ? 10 : character.level >= 11 ? 8 : character.level >= 5 ? 6 : 4;
            // Use Martial Arts die if it's better than the weapon (or if unarmed/punch/kick)
            // Note: "strike" excluded — too common in weapon attack phrasing ("I strike with my sword")
            const isUnarmed = /\b(punch|kick|unarmed|fist|elbow|knee|headbutt|open hand)\b/i.test(playerInput);
            const mentionsWeapon = /\b(sword|axe|mace|hammer|club|dagger|rapier|greatsword|longsword|shortsword|halberd|spear|glaive|quarterstaff|flail|morningstar|warhammer|battleaxe|scimitar|trident|pike|maul|whip)\b/i.test(playerInput);
            if (isUnarmed || (!mentionsWeapon && martialArtsDie > diceSides)) {
              baseDiceCount = 1;
              diceSides = martialArtsDie;
            }
          }
        }
        let diceCount = isCrit ? baseDiceCount * 2 : baseDiceCount;

        // Half-Orc Savage Attacks: extra damage die on critical hit
        if (isCrit && character.race === "Half-Orc" && !isSpell) {
          diceCount += 1;
        }

        let dmgBonus = atkMod;

        // Barbarian Rage bonus: +2 damage on STR-based melee attacks (only while raging)
        if (!isSpell && !isRanged && character.class === "Barbarian" && character.raging && atkAbility === "strength") {
          const rageBonus = character.level >= 16 ? 4 : character.level >= 9 ? 3 : 2;
          dmgBonus += rageBonus;
        }

        // Rogue Sneak Attack: extra d6s when using finesse or ranged weapon
        // In solo play, Sneak Attack applies on every qualifying hit (simplified from advantage/ally rule)
        let sneakAttackDmg = 0;
        if (!isSpell && character.class === "Rogue") {
          const equippedWeapons = character.equipped ?? [];
          const weaponIsFinesse = equippedWeapons.some((w) => FINESSE_WEAPONS.some((f) => w.toLowerCase().includes(f)));
          const weaponIsRanged = equippedWeapons.some((w) => RANGED_WEAPONS.some((r) => w.toLowerCase().includes(r)));
          if (weaponIsFinesse || weaponIsRanged || isRanged) {
            // Sneak Attack dice: 1d6 at level 1, +1d6 every 2 levels (ceil(level/2) d6)
            const sneakDice = Math.ceil(character.level / 2);
            const sneakDiceCount = isCrit ? sneakDice * 2 : sneakDice;
            const sneakRoll = damageRoll(sneakDiceCount, 6, 0);
            sneakAttackDmg = sneakRoll.total;
          }
        }

        // Apply Fighting Style: Dueling (+2 dmg one-handed melee with no offhand weapon)
        if (!isSpell && !isRanged && character.fightingStyle?.includes("Dueling")) {
          const hasTwoHanded = character.equipped?.some((item) => {
            const info = getItemInfo(item);
            return info?.twoHanded;
          });
          if (!hasTwoHanded) dmgBonus += 2;
        }

        let dmg = damageRoll(diceCount, diceSides, dmgBonus);

        // Apply Fighting Style: Great Weapon Fighting (reroll 1-2 on damage dice)
        if (!isSpell && character.fightingStyle?.includes("Great Weapon Fighting")) {
          const hasTwoHanded = character.equipped?.some((item) => {
            const info = getItemInfo(item);
            return info?.twoHanded;
          });
          if (hasTwoHanded) {
            // Reroll each die that rolled 1 or 2 (take new result even if worse — D&D RAW)
            let rerolledTotal = 0;
            for (let i = 0; i < diceCount; i++) {
              let dieResult = d(diceSides);
              if (dieResult <= 2) dieResult = d(diceSides);
              rerolledTotal += dieResult;
            }
            const gwfTotal = Math.max(1, rerolledTotal + dmgBonus);
            dmg = { ...dmg, total: gwfTotal };
          }
        }

        outcome.damageDealt = Math.max(1, dmg.total + sneakAttackDmg);
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(character.level);

        // Warlock (The Fiend) Dark One's Blessing: gain temp HP when reducing a hostile to 0 HP.
        // In our engine each successful hit resolves an encounter (XP awarded), so this triggers per hit.
        // Temp HP = CHA mod + warlock level (added as healing since we don't track temp HP separately).
        if (character.class === "Warlock") {
          const chaBonus = modifier(character.abilityScores.charisma);
          const darkBlessing = Math.max(1, chaBonus + character.level);
          outcome.hpChange += darkBlessing;
        }
      } else {
        // Enemy counterattack — enemy uses their attack bonus vs player AC
        const enemyRoll = d20();
        const enemyTotal = enemyRoll + enemy.attackBonus;
        if (enemyTotal >= character.ac) {
          const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          let dmgTaken = Math.max(1, enemyDmg.total);
          // Barbarian Rage: resistance to bludgeoning, piercing, slashing (only while raging)
          if (character.class === "Barbarian" && character.raging) {
            dmgTaken = Math.max(1, Math.floor(dmgTaken / 2));
          }
          // Tiefling fire resistance & Dragonborn damage resistance (general elemental resistance)
          // Applied as a small reduction since we don't track damage types
          if ((character.race === "Tiefling" || character.race === "Dragonborn") && dmgTaken > 2) {
            dmgTaken = Math.max(1, dmgTaken - 1);
          }
          outcome.hpChange = -dmgTaken;
          outcome.damageTaken = dmgTaken;
        }
      }
      break;
    }

    case "skill_check": {
      const ability = getSkillAbility(playerInput);
      const dc = levelScaledDC(12, character.level);
      const prof = proficiencyBonus(character.level);
      // Gnome Cunning only applies to saving throws vs magic, not skill checks
      const result = abilityCheck(character.abilityScores[ability], dc, ability, prof, lucky);
      const skillName = ability.charAt(0).toUpperCase() + ability.slice(1);
      outcome.roll = { ...result, reason: `${skillName} check — testing your skill` };
      if (result.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      } else if (result.rolled <= 3) {
        // Critical failure: mishap causes minor damage (prevents zero-risk XP farming)
        const mishapDmg = Math.max(1, d(4));
        outcome.hpChange = -mishapDmg;
        outcome.damageTaken = mishapDmg;
        outcome.roll = { ...result, reason: `${skillName} check — critical failure! A mishap occurs` };
      }
      break;
    }

    case "explore": {
      // Only trigger travel encounters for actual overland travel, not local movement
      // (e.g. entering an inn next to you should NOT trigger a wilderness encounter)
      const isOverlandTravel = outcome.locationChange && locationInfo?.isTravel;
      if (isOverlandTravel) {
        // Travel encounter cooldown: prevent XP farming by traveling back and forth
        const turnsSinceLastTravel = (character.lastTravelEncounterTurn ?? -1) >= 0
          ? gameState.turnCount - (character.lastTravelEncounterTurn ?? -1)
          : Infinity;
        const travelCooledDown = turnsSinceLastTravel >= MIN_TURNS_BETWEEN_TRAVEL_ENCOUNTERS;

        const encounterRoll = d20();
        // 30% chance of travel encounter (roll 1-6 on d20), but only if cooldown has passed
        // Travel encounters are resolved in the background — no DC check shown
        // to the player. The DM narrates the encounter seamlessly.
        if (encounterRoll <= 6 && travelCooledDown) {
          outcome.lastTravelEncounterTurn = gameState.turnCount;
          const encounterType = getRandomTravelEncounter(character.level);
          outcome.travelEncounter = encounterType;

          if (encounterType.type === "combat") {
            // Combat encounter on the road — resolved silently
            // Check equipped weapons for ranged to avoid penalizing DEX-based characters
            const travelHasRanged = (character.equipped ?? []).some((w) =>
              RANGED_WEAPONS.some((r) => w.toLowerCase().includes(r))
            );
            const atkAbility = getAttackAbility(character, playerInput, false, travelHasRanged);
            const atkScore = character.abilityScores[atkAbility];
            const prof = proficiencyBonus(character.level);
            const enemy = scaledEnemy(character.level);
            const hit = attackRoll(atkScore, enemy.ac, prof, lucky);
            // Don't set outcome.roll — travel encounters are narration-only
            if (hit.success) {
              const isCrit = hit.rolled === 20;
              const weaponDmg = getWeaponDamage(character.equipped ?? []);
              let diceCount = isCrit ? weaponDmg.dice * 2 : weaponDmg.dice;
              // Half-Orc Savage Attacks: extra weapon die on crit
              if (isCrit && character.race === "Half-Orc") diceCount += 1;
              const dmg = damageRoll(diceCount, weaponDmg.sides, modifier(atkScore));
              // Rogue Sneak Attack (finesse/ranged weapons)
              let sneakDmg = 0;
              if (character.class === "Rogue") {
                const equippedWeapons = character.equipped ?? [];
                const hasValidWeapon = equippedWeapons.some(w =>
                  FINESSE_WEAPONS.some(f => w.toLowerCase().includes(f)) ||
                  RANGED_WEAPONS.some(r => w.toLowerCase().includes(r))
                );
                if (hasValidWeapon) {
                  const sneakDice = Math.ceil(character.level / 2);
                  sneakDmg = damageRoll(isCrit ? sneakDice * 2 : sneakDice, 6, 0).total;
                }
              }
              outcome.damageDealt = Math.max(1, dmg.total + sneakDmg);
              outcome.xpGained = combatXpReward(character.level);
              // Warlock Dark One's Blessing on kill
              if (character.class === "Warlock") {
                const chaBonus = modifier(character.abilityScores.charisma);
                outcome.hpChange += Math.max(1, chaBonus + character.level);
              }
            } else {
              const enemyRoll = d20();
              const enemyTotal = enemyRoll + enemy.attackBonus;
              if (enemyTotal >= character.ac) {
                const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
                let dmgTaken = Math.max(1, enemyDmg.total);
                // Barbarian Rage resistance (only while raging)
                if (character.class === "Barbarian" && character.raging) {
                  dmgTaken = Math.max(1, Math.floor(dmgTaken / 2));
                }
                // Tiefling/Dragonborn damage resistance
                if ((character.race === "Tiefling" || character.race === "Dragonborn") && dmgTaken > 2) {
                  dmgTaken = Math.max(1, dmgTaken - 1);
                }
                outcome.hpChange = -dmgTaken;
                outcome.damageTaken = dmgTaken;
              }
            }
          } else {
            // Non-combat encounter — resolved silently, DM narrates
            const dc = levelScaledDC(10, character.level);
            const prof = proficiencyBonus(character.level);
            const check = abilityCheck(character.abilityScores.wisdom, dc, "wisdom", prof, lucky);
            if (check.success) {
              outcome.xpGained = explorationXpReward(character.level);
            }
          }
        }
        // Safe travel (no encounter) — no roll needed, just arrive
      } else if (!outcome.locationChange) {
        // Not traveling, just looking around locally — use appropriate ability
        // "investigate" uses INT, "search/look" uses WIS, etc.
        const exploreAbility = getSkillAbility(playerInput);
        const dc = levelScaledDC(10, character.level);
        const prof = proficiencyBonus(character.level);
        const perc = abilityCheck(character.abilityScores[exploreAbility], dc, exploreAbility, prof, lucky);
        const exploreName = exploreAbility.charAt(0).toUpperCase() + exploreAbility.slice(1);
        outcome.roll = { ...perc, reason: `${exploreName} check — searching the area` };
        if (perc.success) {
          outcome.xpGained = explorationXpReward(character.level);
        }
      }
      // Local movement (entering a nearby building) — no roll, just go there
      break;
    }

    case "rest": {
      // Can't rest while unconscious
      if (character.isUnconscious) {
        outcome.restDenied = true;
        break;
      }

      // Rest abuse prevention: minimum turns between rests
      const turnsSinceLastRest = character.lastRestTurn >= 0
        ? gameState.turnCount - character.lastRestTurn
        : Infinity;

      if (turnsSinceLastRest < MIN_TURNS_BETWEEN_RESTS) {
        outcome.restDenied = true;
        const turnsRemaining = MIN_TURNS_BETWEEN_RESTS - turnsSinceLastRest;
        outcome.actionDenied = {
          reason: `You rested recently and aren't tired enough yet. You need ${turnsRemaining} more turn${turnsRemaining === 1 ? "" : "s"} of activity before you can rest again.`,
          attempted: "rest",
        };
        break;
      }

      // Detect long rest vs short rest
      const restLower = playerInput.toLowerCase();
      const isLongRest = /\b(long rest|sleep|camp|full rest)\b/i.test(restLower);

      if (isLongRest) {
        // ── Long Rest: fully restore HP, recharge all resources ──
        outcome.hpChange = character.maxHp - character.hp;
        outcome.restType = "long";
        outcome.lastRestTurn = gameState.turnCount;
        // Resource recharge happens in the store when it sees restType
        outcome.roll = {
          type: "check",
          ability: "constitution",
          rolled: character.maxHp,
          modifier: 0,
          total: character.maxHp,
          dc: 0,
          success: true,
          reason: `Long Rest — fully restored to ${character.maxHp} HP. All resources recharged.`,
        };
      } else {
        // ── Short Rest: spend hit dice to heal ──
        // Find hit dice resource
        const hitDiceRes = resources.find((r) => r.key === "hit_dice");
        const conMod = modifier(character.abilityScores.constitution);

        if (hitDiceRes && hitDiceRes.current > 0 && character.hp < character.maxHp) {
          // Spend up to half your level in hit dice (min 1), capped by available dice
          const diceToSpend = Math.min(
            hitDiceRes.current,
            Math.max(1, Math.floor(character.level / 2))
          );
          // Get hit die size from the resource label (e.g. "Hit Dice (d10)" -> 10)
          const dieSizeMatch = hitDiceRes.label.match(/d(\d+)/);
          const dieSize = dieSizeMatch ? parseInt(dieSizeMatch[1], 10) : 8;

          let totalHealed = 0;
          for (let i = 0; i < diceToSpend; i++) {
            totalHealed += Math.max(1, d(dieSize) + conMod);
          }
          const actualHealed = Math.min(totalHealed, character.maxHp - character.hp);
          outcome.hpChange = actualHealed;

          // Consume hit dice
          hitDiceRes.current = Math.max(0, hitDiceRes.current - diceToSpend);

          outcome.roll = {
            type: "check",
            ability: "constitution",
            rolled: totalHealed - (conMod * diceToSpend),
            modifier: conMod * diceToSpend,
            total: totalHealed,
            dc: 0,
            success: true,
            reason: `Short Rest — spent ${diceToSpend} hit ${diceToSpend === 1 ? "die" : "dice"} (d${dieSize}+${conMod} each), healed ${actualHealed} HP`,
          };
        } else if (hitDiceRes && hitDiceRes.current <= 0) {
          // No hit dice left, still get short rest benefits (resource recharge)
          outcome.roll = {
            type: "check",
            ability: "constitution",
            rolled: 0,
            modifier: 0,
            total: 0,
            dc: 0,
            success: true,
            reason: "Short Rest — no hit dice remaining to spend, but short-rest abilities recharged",
          };
        } else {
          // Already at full HP
          outcome.roll = {
            type: "check",
            ability: "constitution",
            rolled: 0,
            modifier: 0,
            total: 0,
            dc: 0,
            success: true,
            reason: "Short Rest — already at full HP. Short-rest abilities recharged.",
          };
        }
        outcome.restType = "short";
        outcome.lastRestTurn = gameState.turnCount;
      }
      break;
    }

    case "trade": {
      // Detect buy or sell intent and resolve mechanically
      const lower = playerInput.toLowerCase();
      const priceModifier = shopPriceModifier(karma ?? character.karma ?? 0);

      // Detect if buying or selling
      const isSelling = /\b(sell|unload|offload|get rid of)\b/i.test(lower);
      const isBuying = /\b(buy|purchase)\b/i.test(lower);

      // Extract item name from input
      const ignoreTradeWords = new Set(["buy", "sell", "trade", "purchase", "barter", "shop", "the", "a", "an", "some", "my", "from", "to", "at", "for", "this", "that", "merchant", "shopkeeper", "vendor", "trader"]);
      const tradeWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !ignoreTradeWords.has(w));

      if (isSelling) {
        // Try to find matching item in inventory
        const matchedItem = character.inventory.find((item) => {
          const itemLow = item.toLowerCase();
          return tradeWords.some(term => itemLow.includes(term));
        });
        if (matchedItem) {
          const sellPrice = getSellPrice(matchedItem, priceModifier);
          outcome.itemsLost = [matchedItem];
          outcome.goldChange = sellPrice;
          outcome.tradeResult = { type: "sell", item: matchedItem, price: sellPrice, success: true };
        } else {
          outcome.tradeResult = { type: "sell", item: tradeWords.join(" "), price: 0, success: false, reason: "Item not found in inventory" };
        }
      } else if (isBuying) {
        // Try to find item in database
        const searchTerm = tradeWords.join(" ");
        const itemInfo = getItemInfo(searchTerm);
        if (itemInfo) {
          const buyPrice = getBuyPrice(itemInfo.name, priceModifier);
          if (character.gold >= buyPrice) {
            outcome.itemsGained = [itemInfo.name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")];
            outcome.goldChange = -buyPrice;
            outcome.tradeResult = { type: "buy", item: itemInfo.name, price: buyPrice, success: true };
          } else {
            outcome.tradeResult = { type: "buy", item: itemInfo.name, price: buyPrice, success: false, reason: "Not enough gold" };
          }
        } else {
          // Unknown item — let the DM narrate, no mechanical effect
          outcome.tradeResult = { type: "buy", item: searchTerm, price: 0, success: false, reason: "Item not available" };
        }
      }
      // Generic "trade" or "shop" without buy/sell — purely narrative
      break;
    }

    case "pickup": {
      // Pickup is PURELY NARRATIVE — the DM describes what's available.
      // The engine does NOT grant items from thin air. Items can only be gained
      // through trade (buying), quest rewards (DM-controlled), or loot after combat.
      // This prevents the exploit of typing "pick up longsword" to get free items.
      const lower = playerInput.toLowerCase();
      const ignorePickupWords = new Set(["pick", "up", "grab", "take", "loot", "collect", "gather", "the", "a", "an", "some", "this", "that", "it"]);
      const pickupWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !ignorePickupWords.has(w));
      const searchTerm = pickupWords.join(" ");
      // Signal intent but don't mechanically grant anything
      outcome.pickupResult = { item: searchTerm || "unknown", success: false, reason: "The DM will describe what you find, if anything" };
      break;
    }

    case "drop_item": {
      // Drop an item from inventory
      const lower = playerInput.toLowerCase();
      const ignoreDropWords = new Set(["drop", "discard", "throw", "away", "leave", "behind", "abandon", "the", "a", "an", "my", "this", "that"]);
      const dropWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !ignoreDropWords.has(w));
      const matchedItem = character.inventory.find((item) => {
        const itemLow = item.toLowerCase();
        return dropWords.some(term => itemLow.includes(term));
      });
      if (matchedItem) {
        outcome.itemsLost = [matchedItem];
        outcome.dropResult = { item: matchedItem, success: true };
      } else {
        outcome.dropResult = { item: dropWords.join(" "), success: false };
      }
      break;
    }

    case "use_item": {
      // Check if the player has the item they're trying to use
      // Bidirectional: input contains item name OR item name contains key words from input
      const lower = playerInput.toLowerCase();
      const inputWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
      const ignoreWords = new Set(["use", "drink", "eat", "equip", "open", "read", "the", "my", "this", "that", "some"]);
      const searchTerms = inputWords.filter(w => !ignoreWords.has(w));
      const matchedItem = character.inventory.find((item) => {
        const itemLow = item.toLowerCase();
        // Exact: input contains full item name
        if (lower.includes(itemLow)) return true;
        // Partial: any search term from input appears in item name
        return searchTerms.some(term => itemLow.includes(term));
      });
      if (matchedItem) {
        const itemLower = matchedItem.toLowerCase();
        const consumables = ["potion", "rations", "scroll", "elixir", "antidote"];
        if (consumables.some((c) => itemLower.includes(c))) {
          outcome.itemsLost = [matchedItem];

          // Healing potions: 2d4+2 HP (D&D standard)
          if (itemLower.includes("healing") || itemLower.includes("health") ||
              (itemLower.includes("potion") && !itemLower.includes("poison"))) {
            const healed = damageRoll(2, 4, 2);
            outcome.hpChange = Math.min(healed.total, character.maxHp - character.hp);
          }

          // Poison potions hurt the player
          if (itemLower.includes("poison")) {
            const dmg = damageRoll(2, 4, 0);
            outcome.hpChange = -dmg.total;
          }
        }
      } else {
        outcome.itemNotFound = true;
      }
      break;
    }

    case "talk": {
      // Social interaction: detect specific social skills or default to CHA
      const detectedAbility = getSkillAbility(playerInput);
      // Intimidate → CHA, Persuade → CHA, Deceive → CHA, Insight → WIS
      const socialAbility = (detectedAbility === "wisdom" && /\binsight\b/i.test(playerInput))
        ? "wisdom" : "charisma";
      const dc = levelScaledDC(11, character.level);
      const prof = proficiencyBonus(character.level);
      const socialResult = abilityCheck(
        character.abilityScores[socialAbility],
        dc,
        socialAbility,
        prof,
        lucky
      );
      const skillLabel = socialAbility === "wisdom" ? "Insight" : "Charisma";
      outcome.roll = { ...socialResult, reason: `${skillLabel} check — social interaction` };
      if (socialResult.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      } else if (socialResult.rolled <= 3) {
        // Critical social failure: offend the NPC, lose some reputation
        outcome.fameChange = -1;
        outcome.fameReason = "A badly botched social interaction";
        outcome.fameCategory = "social";
        outcome.roll = { ...socialResult, reason: `${skillLabel} check — social blunder! You deeply offend them` };
      }
      break;
    }

    case "second_wind": {
      // Fighter class feature: heal 1d10 + Fighter level, usable once per rest
      if (character.class !== "Fighter") {
        outcome.actionDenied = {
          reason: `Second Wind is a Fighter class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Second Wind",
        };
        break;
      }
      // Resource check: 1 use per short rest
      {
        const consumed = consumeResource(resources, "second_wind");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've already used Second Wind. It recharges after a short rest.",
            attempted: "use Second Wind",
          };
          break;
        }
        resources = consumed.pool;
      }
      // Heal 1d10 + level
      const healRoll = d(10) + character.level;
      const healed = Math.min(healRoll, character.maxHp - character.hp);
      outcome.hpChange = healed;
      outcome.roll = {
        type: "check",
        ability: "constitution",
        rolled: healRoll - character.level,
        modifier: character.level,
        total: healRoll,
        dc: 0,
        success: true,
        reason: "Second Wind — rallying your strength",
      };
      break;
    }

    case "breath_weapon": {
      // Dragonborn racial trait: 2d6 damage, DC 8 + CON mod + prof
      if (character.race !== "Dragonborn") {
        outcome.actionDenied = {
          reason: "Breath Weapon is a Dragonborn racial ability. Your race doesn't have this feature.",
          attempted: "use Breath Weapon",
        };
        break;
      }
      // Resource check: 1 use per short rest
      {
        const consumed = consumeResource(resources, "breath_weapon");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've already used your Breath Weapon. It recharges after a short rest.",
            attempted: "use Breath Weapon",
          };
          break;
        }
        resources = consumed.pool;
      }
      const prof = proficiencyBonus(character.level);
      // Scale damage: 2d6 at levels 1-5, 3d6 at 6-10, 4d6 at 11-15, 5d6 at 16+
      const breathDice = character.level >= 16 ? 5 : character.level >= 11 ? 4 : character.level >= 6 ? 3 : 2;
      const breathDmg = damageRoll(breathDice, 6, 0);
      outcome.damageDealt = Math.max(1, breathDmg.total);
      outcome.roll = {
        type: "damage",
        rolled: breathDmg.rolled,
        modifier: 0,
        total: breathDmg.total,
        success: true,
        reason: `Breath Weapon — ${breathDice}d6 elemental damage`,
      };
      // Reduced XP for Breath Weapon (no risk of counterattack, guaranteed hit)
      outcome.xpGained = skillCheckXpReward(character.level);
      break;
    }

    case "bardic_inspiration": {
      // Bard class feature: inspire self or allies with a d6 (scales at higher levels)
      // Requires a CHA performance check to succeed — prevents zero-risk XP farming
      if (character.class !== "Bard") {
        outcome.actionDenied = {
          reason: `Bardic Inspiration is a Bard class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Bardic Inspiration",
        };
        break;
      }
      // Resource check
      {
        const consumed = consumeResource(resources, "bardic_inspiration");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've used all your Bardic Inspiration dice. They recharge after a rest.",
            attempted: "use Bardic Inspiration",
          };
          break;
        }
        resources = consumed.pool;
      }
      // Inspiration die scales: d6 at L1, d8 at L5, d10 at L10, d12 at L15
      const inspireDie = character.level >= 15 ? 12 : character.level >= 10 ? 10 : character.level >= 5 ? 8 : 6;
      const inspireProf = proficiencyBonus(character.level);
      const inspireDC = levelScaledDC(12, character.level);
      const inspireCheck = abilityCheck(character.abilityScores.charisma, inspireDC, "charisma", inspireProf, lucky);
      if (inspireCheck.success) {
        const inspireRoll = d(inspireDie);
        outcome.roll = {
          type: "check",
          ability: "charisma",
          rolled: inspireCheck.rolled,
          modifier: inspireCheck.modifier,
          total: inspireCheck.total,
          dc: inspireDC,
          success: true,
          reason: `Bardic Inspiration — a rousing d${inspireDie} performance (CHA check DC ${inspireDC})`,
        };
        outcome.xpGained = explorationXpReward(character.level);
      } else {
        outcome.roll = {
          ...inspireCheck,
          reason: `Bardic Inspiration — your performance falls flat (CHA check DC ${inspireDC})`,
        };
      }
      break;
    }

    case "channel_divinity": {
      // Cleric class feature: Turn Undead or Preserve Life (Life Domain) — level 2+
      if (character.class !== "Cleric") {
        outcome.actionDenied = {
          reason: `Channel Divinity is a Cleric class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Channel Divinity",
        };
        break;
      }
      if (character.level < 2) {
        outcome.actionDenied = {
          reason: "You haven't yet learned to channel divine power. Clerics gain Channel Divinity at level 2.",
          attempted: "use Channel Divinity",
        };
        break;
      }
      // Resource check
      {
        const consumed = consumeResource(resources, "channel_divinity");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've exhausted your Channel Divinity uses. They recharge after a short rest.",
            attempted: "use Channel Divinity",
          };
          break;
        }
        resources = consumed.pool;
      }
      const lower = playerInput.toLowerCase();
      if (/preserve life/i.test(lower)) {
        // Life Domain: Preserve Life — heal up to 5 × Cleric level HP
        const healPool = 5 * character.level;
        const healed = Math.min(healPool, character.maxHp - character.hp);
        outcome.hpChange = healed;
        outcome.roll = {
          type: "check",
          ability: "wisdom",
          rolled: healPool,
          modifier: 0,
          total: healPool,
          dc: 0,
          success: true,
          reason: `Channel Divinity: Preserve Life — ${healPool} HP healing pool`,
        };
      } else {
        // Turn Undead: WIS-based effect, deals radiant damage (simulated)
        const prof = proficiencyBonus(character.level);
        const wisMod = modifier(character.abilityScores.wisdom);
        // Destroy Undead at level 5+ deals damage; Turn Undead forces undead to flee
        const turnDice = character.level >= 17 ? 6 : character.level >= 11 ? 4 : character.level >= 5 ? 3 : 2;
        const turnDmg = damageRoll(turnDice, 8, wisMod);
        outcome.damageDealt = Math.max(1, turnDmg.total);
        outcome.roll = {
          type: "damage",
          rolled: turnDmg.rolled,
          modifier: wisMod,
          total: turnDmg.total,
          success: true,
          reason: `Channel Divinity: Turn Undead — DC ${8 + prof + wisMod} WIS save or be turned`,
        };
      }
      // Reduced XP for Channel Divinity (no risk of counterattack)
      outcome.xpGained = skillCheckXpReward(character.level);
      break;
    }

    case "wild_shape": {
      // Druid class feature: transform into a beast form
      if (character.class !== "Druid") {
        outcome.actionDenied = {
          reason: `Wild Shape is a Druid class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Wild Shape",
        };
        break;
      }
      if (character.level < 2) {
        outcome.actionDenied = {
          reason: "You haven't yet learned to channel the primal magic of Wild Shape. Druids gain this ability at level 2.",
          attempted: "use Wild Shape",
        };
        break;
      }
      // Resource check: 2 uses per short rest
      {
        const consumed = consumeResource(resources, "wild_shape");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've used both Wild Shape charges. They recharge after a short rest.",
            attempted: "use Wild Shape",
          };
          break;
        }
        resources = consumed.pool;
      }
      // Wild Shape grants temporary HP based on beast form (simulated)
      // CR scales: L2 = CR 1/4 (~7 HP), L4 = CR 1/2 (~19 HP), L8 = CR 1 (~33 HP)
      const beastHP = character.level >= 8 ? 33 : character.level >= 4 ? 19 : 7;
      // Wild Shape acts as a temp HP buffer — can exceed maxHP since it's a separate HP pool
      outcome.hpChange = beastHP;
      outcome.roll = {
        type: "check",
        ability: "wisdom",
        rolled: beastHP,
        modifier: 0,
        total: beastHP,
        dc: 0,
        success: true,
        reason: `Wild Shape — beast form grants ${beastHP} temporary HP`,
      };
      break;
    }

    case "flurry_of_blows": {
      // Monk class feature: spend Ki for extra unarmed strikes or defensive abilities
      if (character.class !== "Monk") {
        outcome.actionDenied = {
          reason: `Flurry of Blows is a Monk class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Ki abilities",
        };
        break;
      }
      if (character.level < 2) {
        outcome.actionDenied = {
          reason: "You haven't yet learned to harness your Ki. Monks gain Ki at level 2.",
          attempted: "use Ki abilities",
        };
        break;
      }
      // Resource check: 1 Ki point per use
      {
        const consumed = consumeResource(resources, "ki");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've spent all your Ki points. They recharge after a short rest.",
            attempted: "use Ki abilities",
          };
          break;
        }
        resources = consumed.pool;
      }
      const lower = playerInput.toLowerCase();
      if (/patient defense/i.test(lower)) {
        // Patient Defense: Dodge action as bonus action (narrative — improves AC situationally)
        outcome.roll = {
          type: "check",
          ability: "dexterity",
          rolled: 0,
          modifier: 0,
          total: 0,
          dc: 0,
          success: true,
          reason: "Patient Defense — you focus your Ki into a defensive stance",
        };
        break;
      }
      if (/step of the wind/i.test(lower)) {
        // Step of the Wind: Disengage or Dash as bonus action
        outcome.roll = {
          type: "check",
          ability: "dexterity",
          rolled: 0,
          modifier: 0,
          total: 0,
          dc: 0,
          success: true,
          reason: "Step of the Wind — your Ki carries you with supernatural speed",
        };
        break;
      }
      // Flurry of Blows / Ki Strike: two unarmed strikes (Martial Arts die)
      const martialDie = character.level >= 17 ? 10 : character.level >= 11 ? 8 : character.level >= 5 ? 6 : 4;
      const atkAbilityMonk: keyof typeof character.abilityScores =
        character.abilityScores.dexterity >= character.abilityScores.strength ? "dexterity" : "strength";
      const atkScoreMonk = character.abilityScores[atkAbilityMonk];
      const profMonk = proficiencyBonus(character.level);
      const enemy = scaledEnemy(character.level);
      const hit = attackRoll(atkScoreMonk, enemy.ac, profMonk, lucky);
      outcome.roll = { ...hit, reason: "Flurry of Blows — rapid unarmed strikes" };
      if (hit.success) {
        const isCrit = hit.rolled === 20;
        // Two strikes with Martial Arts die — each strike adds ability modifier
        const diceCount = isCrit ? 4 : 2;
        const atkMod = modifier(atkScoreMonk);
        const dmg = damageRoll(diceCount, martialDie, atkMod * 2);
        outcome.damageDealt = Math.max(1, dmg.total);
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(character.level);

        // Stunning Strike at level 5+: enemy must CON save or be stunned
        if (character.level >= 5 && /stunning strike/i.test(lower)) {
          const stunDC = 8 + profMonk + modifier(character.abilityScores.wisdom);
          outcome.roll = { ...outcome.roll, reason: `Stunning Strike — DC ${stunDC} CON save or stunned` };
        }
      } else {
        // Counterattack
        const enemyRoll = d20();
        const enemyTotal = enemyRoll + enemy.attackBonus;
        if (enemyTotal >= character.ac) {
          const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          outcome.hpChange = -Math.max(1, enemyDmg.total);
          outcome.damageTaken = Math.max(1, enemyDmg.total);
        }
      }
      break;
    }

    case "lay_on_hands": {
      // Paladin class feature: heal from a pool of 5 × Paladin level HP
      if (character.class !== "Paladin") {
        outcome.actionDenied = {
          reason: `Lay on Hands is a Paladin class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Lay on Hands",
        };
        break;
      }
      // Check remaining pool from resources
      const lohRes = resources.find((r) => r.key === "lay_on_hands");
      const poolRemaining = lohRes?.current ?? 0;
      if (poolRemaining <= 0) {
        outcome.actionDenied = {
          reason: "Your Lay on Hands healing pool is empty. It recharges after a long rest.",
          attempted: "use Lay on Hands",
        };
        break;
      }
      const hpNeeded = character.maxHp - character.hp;
      const healAmount = Math.min(poolRemaining, hpNeeded);
      // Consume from the pool
      if (lohRes) {
        lohRes.current = Math.max(0, lohRes.current - healAmount);
      }
      outcome.hpChange = healAmount;
      outcome.roll = {
        type: "check",
        ability: "charisma",
        rolled: poolRemaining,
        modifier: 0,
        total: healAmount,
        dc: 0,
        success: true,
        reason: `Lay on Hands — ${healAmount} HP restored (${Math.max(0, poolRemaining - healAmount)} remaining in pool)`,
      };
      break;
    }

    case "divine_smite": {
      // Paladin class feature: melee attack + extra radiant damage (costs a spell slot)
      if (character.class !== "Paladin") {
        outcome.actionDenied = {
          reason: `Divine Smite is a Paladin class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "use Divine Smite",
        };
        break;
      }
      if (character.level < 2) {
        outcome.actionDenied = {
          reason: "You haven't yet learned to channel divine energy into your strikes. Paladins gain Divine Smite at level 2.",
          attempted: "use Divine Smite",
        };
        break;
      }
      // Resource check: consumes a spell slot
      {
        const slotKey = findSpellSlot(resources);
        if (!slotKey) {
          outcome.actionDenied = {
            reason: "You have no spell slots remaining to fuel Divine Smite. They recharge after a long rest.",
            attempted: "use Divine Smite",
          };
          break;
        }
        const consumed = consumeResource(resources, slotKey);
        resources = consumed.pool;
      }
      // Melee attack + 2d8 radiant damage (scales: +1d8 per spell slot level above 1st)
      // Use higher of STR/DEX if wielding a finesse weapon (e.g. rapier)
      const equippedWeapons = character.equipped ?? [];
      const hasFinesse = equippedWeapons.some(w => FINESSE_WEAPONS.some(f => w.toLowerCase().includes(f)));
      const smiteAbility = hasFinesse && character.abilityScores.dexterity > character.abilityScores.strength
        ? "dexterity" : "strength";
      const atkScore = character.abilityScores[smiteAbility];
      const prof = proficiencyBonus(character.level);
      const enemy = scaledEnemy(character.level);
      const hit = attackRoll(atkScore, enemy.ac, prof, lucky);
      outcome.roll = { ...hit, reason: "Divine Smite — holy strike" };
      if (hit.success) {
        const isCrit = hit.rolled === 20;
        const weaponDmg = getWeaponDamage(equippedWeapons);
        // Weapon damage + 2d8 radiant (3d8 vs undead, but we simplify)
        const smiteDice = character.level >= 11 ? 4 : character.level >= 5 ? 3 : 2;
        let weaponDice = isCrit ? weaponDmg.dice * 2 : weaponDmg.dice;
        const smiteDiceCount = isCrit ? smiteDice * 2 : smiteDice;
        // Half-Orc Savage Attacks: extra weapon die on crit
        if (isCrit && character.race === "Half-Orc") weaponDice += 1;
        const atkMod = modifier(atkScore);
        // Roll weapon damage (with Half-Orc extra die included)
        const weapDmgRoll = damageRoll(weaponDice, weaponDmg.sides, atkMod);
        // Roll smite damage (d8 radiant)
        const smiteDmgRoll = damageRoll(smiteDiceCount, 8, 0);
        outcome.damageDealt = Math.max(1, weapDmgRoll.total + smiteDmgRoll.total);
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(character.level);
      } else {
        // Counterattack
        const enemyRoll = d20();
        const enemyTotal = enemyRoll + enemy.attackBonus;
        if (enemyTotal >= character.ac) {
          const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          outcome.hpChange = -Math.max(1, enemyDmg.total);
          outcome.damageTaken = Math.max(1, enemyDmg.total);
        }
      }
      break;
    }

    case "rage": {
      // Barbarian class feature: enter a rage for bonus damage and damage resistance
      if (character.class !== "Barbarian") {
        outcome.actionDenied = {
          reason: `Rage is a Barbarian class feature. As a ${character.class}, you don't have this ability.`,
          attempted: "enter a Rage",
        };
        break;
      }
      if (character.raging) {
        outcome.roll = {
          type: "check", ability: "strength", rolled: 0, modifier: 0, total: 0, dc: 0,
          success: true, reason: "You are already raging!",
        };
        break;
      }
      // Resource check: limited rages per long rest
      {
        const consumed = consumeResource(resources, "rage");
        if (!consumed.success) {
          outcome.actionDenied = {
            reason: "You've exhausted your rage uses for the day. They recharge after a long rest.",
            attempted: "enter a Rage",
          };
          break;
        }
        resources = consumed.pool;
      }
      // Rage is a bonus action activation — sets raging state for damage bonus + resistance
      outcome.raging = true;
      outcome.roll = {
        type: "check",
        ability: "strength",
        rolled: 0,
        modifier: 0,
        total: 0,
        dc: 0,
        success: true,
        reason: "Rage activated — primal fury surges through your veins",
      };
      break;
    }

    case "equip_item": {
      // Parse item name from input and signal equip to the store
      const lower = playerInput.toLowerCase();
      const ignoreEquipWords = new Set(["equip", "wield", "wear", "put", "on", "don", "the", "my", "a", "an", "this", "that"]);
      const equipWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !ignoreEquipWords.has(w));
      const matchedItem = character.inventory.find((item) => {
        const itemLow = item.toLowerCase();
        return equipWords.some(term => itemLow.includes(term));
      });
      if (matchedItem) {
        if (isEquippable(matchedItem)) {
          outcome.equipItem = matchedItem;
        } else {
          outcome.actionDenied = {
            reason: `${matchedItem} is not an equippable item. It's a general supply or consumable.`,
            attempted: `equip ${matchedItem}`,
          };
        }
      } else {
        outcome.itemNotFound = true;
      }
      break;
    }

    case "identify_item": {
      // Identifying items: requires Arcana check or a caster with Identify spell
      const lower = playerInput.toLowerCase();
      const ignoreIdWords = new Set(["identify", "appraise", "examine", "closely", "inspect", "study", "item", "the", "my", "a", "an", "this", "that"]);
      const idWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !ignoreIdWords.has(w));
      const matchedItem = character.inventory.find((item) => {
        const itemLow = item.toLowerCase();
        return idWords.some(term => itemLow.includes(term));
      });
      if (matchedItem) {
        const itemInfo = getItemInfo(matchedItem);
        if (itemInfo?.isMagical && !character.identifiedItems?.includes(matchedItem)) {
          // Arcana check to identify — DC 15 (standard for magical items)
          const prof = proficiencyBonus(character.level);
          const hasArcana = character.skillProficiencies?.includes("Arcana");
          const arcanaResult = abilityCheck(
            character.abilityScores.intelligence,
            15,
            "intelligence",
            hasArcana ? prof : 0,
            lucky
          );
          outcome.roll = { ...arcanaResult, reason: "Arcana check — identifying magical item" };
          if (arcanaResult.success) {
            outcome.identifyItem = matchedItem;
            outcome.xpGained = skillCheckXpReward(character.level);
          }
        } else if (itemInfo && !itemInfo.isMagical) {
          // Non-magical items are automatically recognized
          outcome.identifyItem = matchedItem;
        } else {
          // Already identified
          outcome.actionDenied = {
            reason: "You've already identified this item.",
            attempted: `identify ${matchedItem}`,
          };
        }
      } else {
        outcome.itemNotFound = true;
      }
      break;
    }

    case "unknown":
      // Purely narrative — no mechanical effect
      break;
  }

  // ── Karma Detection (with diminishing returns at extremes) ──
  const currentKarma = karma ?? character.karma ?? 0;
  const currentFame = character.fame ?? 0;
  const karmaAction = detectKarmaAction(playerInput);
  if (karmaAction) {
    // Apply diminishing returns: harder to push past |50| karma
    const adjustedAmount = applyKarmaDiminishing(karmaAction.amount, currentKarma);
    outcome.karmaChange = {
      type: karmaAction.type,
      amount: adjustedAmount,
      description: playerInput.slice(0, 80),
    };
    // Notable actions (good or evil) increase fame — doing things gets you noticed
    const fameGain = Math.max(1, Math.floor(Math.abs(karmaAction.amount) / 2));
    outcome.fameChange = (outcome.fameChange ?? 0) + fameGain;
    outcome.fameReason = karmaAction.amount > 0
      ? "Your good deeds have been noticed"
      : "Word of your actions spreads";
    outcome.fameCategory = "social";
  }

  // Combat victories: fame scaled by level (prevents farming weak enemies)
  if (outcome.damageDealt && outcome.damageDealt > 0) {
    const combatFame = scaledCombatFame(character.level, currentFame);
    if (combatFame > 0) {
      outcome.fameChange = (outcome.fameChange ?? 0) + combatFame;
      if (!outcome.fameReason) {
        outcome.fameReason = "Victory in combat";
        outcome.fameCategory = "combat";
      }
    }
  }
  // Quest completions always grant fame
  if (outcome.completeQuest) {
    outcome.fameChange = (outcome.fameChange ?? 0) + 3;
    outcome.fameReason = "Quest completed";
    outcome.fameCategory = "quest";
  }

  // ── Crime Detection ─────────────────────────────────────────
  const crimeType = detectCrime(playerInput);
  if (crimeType) {
    outcome.crimeDetected = {
      type: crimeType,
      description: playerInput.slice(0, 80),
      location: gameState.location,
    };
    // Crimes reduce fame — getting caught doing bad things hurts reputation
    const crimeFamePenalty = CRIME_FAME_PENALTY[crimeType] ?? -1;
    outcome.fameChange = (outcome.fameChange ?? 0) + crimeFamePenalty;
    outcome.fameReason = `Criminal act: ${crimeType}`;
    outcome.fameCategory = "crime";
  }

  // ── Karma & Fame Drift on Rest ────────────────────────────
  if (action === "rest" && !outcome.restDenied) {
    const karmaDrift = karmaRestDrift(currentKarma);
    if (karmaDrift !== 0) {
      outcome.karmaChange = outcome.karmaChange ?? {
        type: "pragmatic_choice",
        amount: 0,
        description: "Karma drifts toward neutral during rest",
      };
      outcome.karmaChange.amount += karmaDrift;
    }
    const fameDecay = fameRestDecay(currentFame);
    if (fameDecay !== 0) {
      outcome.fameChange = (outcome.fameChange ?? 0) + fameDecay;
      outcome.fameReason = "Time passes — people forget";
      outcome.fameCategory = "decay";
    }
  }

  // ── Divine Intervention ──────────────────────────────────────
  const divine = checkDivineIntervention(currentKarma, gameState.turnCount);
  if (divine && divine.source !== "none" && divine.type !== "none") {
    outcome.divineEffect = {
      source: divine.source as "good_god" | "evil_god",
      type: divine.type as "blessing" | "punishment" | "temptation",
      description: divine.description,
      rollModifier: divine.rollModifier,
    };
  }

  // ── Item Affinity Modifiers (evil = harder, good = more gold) ──
  const affinity = getItemAffinity(currentKarma);
  if (affinity.powerBonus > 0 && outcome.damageDealt) {
    outcome.damageDealt += affinity.powerBonus;
  }
  if (affinity.goldMultiplier !== 1.0 && outcome.goldChange > 0) {
    outcome.goldChange = Math.round(outcome.goldChange * affinity.goldMultiplier);
  }

  // Attach updated resource pool if any resources were consumed
  if (resources.length > 0) {
    outcome.resourceUpdates = resources;
  }

  return outcome;
}
