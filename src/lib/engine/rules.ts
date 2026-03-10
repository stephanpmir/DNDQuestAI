import type { Character } from "@/types/character";
import type { EngineOutcome, WorldEvent } from "@/types/world";
import { abilityCheck, attackRoll, damageRoll, modifier, d20 } from "./dice";
import { detectKarmaAction, checkDivineIntervention, getItemAffinity } from "@/lib/karma";

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
  | "self_harm"
  | "death_save"
  | "unknown";

/** Keywords that map to action types — ORDER MATTERS: more specific patterns first */
const ACTION_PATTERNS: [RegExp, ActionType][] = [
  [/\b(attack|strike|hit|fight|slash|stab|shoot|swing)\b/i, "attack"],
  [/\b(cast|spell|magic|fireball|heal|cure)\b/i, "cast_spell"],
  [/\b(pick lock|sneak|hide|stealth|climb|swim|jump|search|investigate|persuade|intimidate|deceive|perception|check)\b/i, "skill_check"],
  [/\b(rest|sleep|camp|long rest|short rest)\b/i, "rest"],
  [/\b(talk|speak|ask|greet|negotiate|converse|say)\b/i, "talk"],
  [/\b(buy|sell|trade|shop|purchase|barter)\b/i, "trade"],
  [/\b(use|drink|eat|equip|open|read)\b/i, "use_item"],
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
    if (pattern.test(playerInput)) return action;
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

  switch (action) {
    case "death_save": {
      // D&D 5e death saving throws — DC 10, no modifiers
      const rolled = d20();
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
      const conSave = abilityCheck(character.abilityScores.constitution, 12, "constitution");
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
      // D&D 5e attack: d20 + ability modifier + proficiency bonus vs enemy AC
      const atkAbility = action === "cast_spell" ? "intelligence" : "strength";
      const atkScore = character.abilityScores[atkAbility];
      const atkMod = modifier(atkScore);
      const prof = proficiencyBonus(character.level);
      const totalAtkBonus = atkMod + prof;

      const enemy = scaledEnemy(character.level);
      const hit = attackRoll(atkScore, enemy.ac, prof);
      outcome.roll = { ...hit, reason: action === "cast_spell" ? "Spell attack roll" : "Attack roll — striking the enemy" };

      if (hit.success) {
        // Roll damage — critical hit on natural 20 doubles dice
        const isCrit = hit.rolled === 20;
        const baseDiceCount = action === "cast_spell" ? 2 : 1;
        const diceSides = action === "cast_spell" ? 6 : 8;
        const diceCount = isCrit ? baseDiceCount * 2 : baseDiceCount;
        const dmg = damageRoll(diceCount, diceSides, atkMod);
        // Minimum 1 damage on a hit
        outcome.damageDealt = Math.max(1, dmg.total);
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(character.level);
      } else {
        // Enemy counterattack — enemy uses their attack bonus vs player AC
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

    case "skill_check": {
      const ability = getSkillAbility(playerInput);
      const dc = levelScaledDC(12, character.level);
      const prof = proficiencyBonus(character.level);
      const result = abilityCheck(character.abilityScores[ability], dc, ability, prof);
      const skillName = ability.charAt(0).toUpperCase() + ability.slice(1);
      outcome.roll = { ...result, reason: `${skillName} check — testing your skill` };
      if (result.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      }
      break;
    }

    case "explore": {
      // Only trigger travel encounters for actual overland travel, not local movement
      // (e.g. entering an inn next to you should NOT trigger a wilderness encounter)
      const isOverlandTravel = outcome.locationChange && locationInfo?.isTravel;
      if (isOverlandTravel) {
        const encounterRoll = d20();
        // 30% chance of travel encounter (roll 1-6 on d20)
        // Travel encounters are resolved in the background — no DC check shown
        // to the player. The DM narrates the encounter seamlessly.
        if (encounterRoll <= 6) {
          const encounterType = getRandomTravelEncounter(character.level);
          outcome.travelEncounter = encounterType;

          if (encounterType.type === "combat") {
            // Combat encounter on the road — resolved silently
            const atkAbility = "strength" as const;
            const atkScore = character.abilityScores[atkAbility];
            const prof = proficiencyBonus(character.level);
            const enemy = scaledEnemy(character.level);
            const hit = attackRoll(atkScore, enemy.ac, prof);
            // Don't set outcome.roll — travel encounters are narration-only
            if (hit.success) {
              const dmg = damageRoll(1, 8, modifier(atkScore));
              outcome.damageDealt = Math.max(1, dmg.total);
              outcome.xpGained = combatXpReward(character.level);
            } else {
              const enemyRoll = d20();
              const enemyTotal = enemyRoll + enemy.attackBonus;
              if (enemyTotal >= character.ac) {
                const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
                outcome.hpChange = -Math.max(1, enemyDmg.total);
                outcome.damageTaken = Math.max(1, enemyDmg.total);
              }
            }
          } else {
            // Non-combat encounter — resolved silently, DM narrates
            const dc = levelScaledDC(10, character.level);
            const prof = proficiencyBonus(character.level);
            const check = abilityCheck(character.abilityScores.wisdom, dc, "wisdom", prof);
            if (check.success) {
              outcome.xpGained = explorationXpReward(character.level);
            }
          }
        }
        // Safe travel (no encounter) — no roll needed, just arrive
      } else if (!outcome.locationChange) {
        // Not traveling, just looking around locally
        const dc = levelScaledDC(10, character.level);
        const prof = proficiencyBonus(character.level);
        const perc = abilityCheck(character.abilityScores.wisdom, dc, "wisdom", prof);
        outcome.roll = { ...perc, reason: "Perception check — searching the area" };
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
        break;
      }

      // Short rest: recover some HP (minimum 1 HP healed if not at max)
      const conMod = modifier(character.abilityScores.constitution);
      const healed = Math.max(1, Math.floor(character.maxHp * 0.25) + conMod);
      outcome.hpChange = Math.min(healed, character.maxHp - character.hp);
      outcome.lastRestTurn = gameState.turnCount;
      break;
    }

    case "trade": {
      // Trade interactions are narrative — no mechanical effect from engine
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
      // Social interaction: CHA check with proficiency
      // getSkillAbility returns "charisma" for persuade/deceive/intimidate
      // For generic "talk" it returns "wisdom" — override to charisma for social
      const detectedAbility = getSkillAbility(playerInput);
      const socialAbility = detectedAbility === "charisma" ? "charisma" : "charisma";
      const dc = levelScaledDC(11, character.level);
      const prof = proficiencyBonus(character.level);
      const socialResult = abilityCheck(
        character.abilityScores[socialAbility],
        dc,
        "charisma",
        prof
      );
      outcome.roll = { ...socialResult, reason: "Charisma check — social interaction" };
      if (socialResult.success) {
        outcome.xpGained = skillCheckXpReward(character.level);
      }
      break;
    }

    case "unknown":
      // Purely narrative — no mechanical effect
      break;
  }

  // ── Karma Detection ──────────────────────────────────────────
  const karmaAction = detectKarmaAction(playerInput);
  if (karmaAction) {
    outcome.karmaChange = {
      type: karmaAction.type,
      amount: karmaAction.amount,
      description: playerInput.slice(0, 80),
    };
    // Notable actions (good or evil) increase fame — doing things gets you noticed
    const fameGain = Math.max(1, Math.floor(Math.abs(karmaAction.amount) / 2));
    outcome.fameChange = (outcome.fameChange ?? 0) + fameGain;
  }

  // Combat victories and quest completions also increase fame
  if (outcome.damageDealt && outcome.damageDealt > 0) {
    outcome.fameChange = (outcome.fameChange ?? 0) + 1;
  }
  if (outcome.completeQuest) {
    outcome.fameChange = (outcome.fameChange ?? 0) + 3;
  }

  // ── Divine Intervention ──────────────────────────────────────
  const currentKarma = karma ?? character.karma ?? 0;
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

  return outcome;
}
