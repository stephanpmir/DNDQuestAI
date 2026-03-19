/**
 * Combat Engine — resolves combat rounds using the SRD monster database.
 *
 * Every enemy is looked up via getMonsterByName() from monsters.ts.
 * Player weapon damage comes from equipped items via getWeaponDamage().
 * Damage resistances and immunities from the monster DB are applied.
 * Enemy HP persists across rounds in CombatState.
 */

import type { Character } from "@/types/character";
import type { RollResult } from "@/types/world";
import type { Condition, CombatantState } from "@/types/combat";
import { createDefaultCombatantState } from "@/types/combat";
import { getMonsterByName, getMonstersByCR, MONSTER_DB } from "@/lib/monsters";
import type { Monster, MonsterAttack } from "@/lib/monsters";
import { getWeaponDamage, getItemInfo } from "@/lib/items";
import { generateLoot } from "@/lib/loot-engine";
import { attackRoll, damageRoll, modifier, d20, roll, savingThrow } from "@/lib/engine/dice";

// ── Combat state ─────────────────────────────────────────────────

export interface CombatState {
  active: boolean;
  enemyName: string;
  enemyKey: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyAc: number;
  roundNumber: number;
  playerInitiative: number;
  enemyInitiative: number;
  /** Full monster data from the SRD DB */
  monster: Monster;
  /** Combatant state for the player */
  playerCombatant: CombatantState;
  /** Combatant state for the enemy */
  enemyCombatant: CombatantState;
  /** Turn order within a round */
  initiativeOrder: ("player" | "enemy")[];
  /** Index into initiativeOrder for whose turn it is */
  currentTurnIndex: number;
  /** Number of remaining attacks for enemy multiattack this turn */
  enemyRemainingAttacks: number;
  /** Whether this is a surprise round */
  surpriseRound: boolean;
  /** Which side is surprised ("none" for normal rounds) */
  surprisedSide: "player" | "enemy" | "none";
}

/** Full dice breakdown for transparency in combat log */
export interface DiceBreakdown {
  /** Player attack: d20 roll + modifier = total vs AC */
  playerAttackRoll?: { d20: number; modifier: number; total: number; targetAC: number; hit: boolean; crit: boolean };
  /** Player damage: dice rolled + bonus = total (before resistances) */
  playerDamageRoll?: { dice: number[]; bonus: number; rawTotal: number; sneakAttackDice?: number[]; damageType: string; resisted: boolean; immune: boolean; finalDamage: number };
  /** Enemy attack: d20 roll + modifier = total vs AC */
  enemyAttackRoll?: { d20: number; modifier: number; total: number; targetAC: number; hit: boolean; crit: boolean; attackName: string };
  /** Enemy damage: dice rolled + bonus = total */
  enemyDamageRoll?: { dice: number[]; bonus: number; total: number; damageType: string };
  /** Initiative rolls (round 1 only) */
  initiative?: { playerRoll: number; playerMod: number; playerTotal: number; enemyRoll: number; enemyMod: number; enemyTotal: number };
}

export interface CombatRoundResult {
  /** Narrative description of what happened this round */
  narrative: string;
  /** Full dice breakdown for every roll this round */
  diceBreakdown: DiceBreakdown;
  /** Player's attack roll result */
  playerAttack: RollResult | null;
  /** Damage dealt by the player (after resistances/immunities) */
  playerDamage: number;
  /** Whether the player's damage was resisted (halved) */
  playerDamageResisted: boolean;
  /** Whether the player's damage was immune (negated) */
  playerDamageImmune: boolean;
  /** Enemy's attack roll result */
  enemyAttack: RollResult | null;
  /** Damage dealt by the enemy */
  enemyDamage: number;
  /** Updated combat state */
  combatState: CombatState;
  /** HP change to apply to player (negative = damage taken) */
  playerHpChange: number;
  /** XP awarded if combat ended via kill */
  xpAwarded: number;
  /** Gold dropped if combat ended via kill */
  goldDropped: number;
  /** Items dropped if combat ended via kill */
  itemsDropped: string[];
  /** Flavor narrative describing the loot drop */
  lootNarrative: string;
  /** Whether combat has ended */
  combatOver: boolean;
  /** How combat ended */
  combatEndReason: "ongoing" | "enemy_killed" | "player_fled" | "player_down";
}

// ── Proficiency bonus by level ───────────────────────────────────

function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

// ── Weapon classification ────────────────────────────────────────

const FINESSE_WEAPONS = ["rapier", "shortsword", "scimitar", "dagger", "whip"];
const RANGED_WEAPONS = ["longbow", "shortbow", "crossbow", "hand crossbow", "light crossbow", "heavy crossbow"];

function getPlayerAttackAbility(character: Character): "strength" | "dexterity" {
  const equipped = character.equipped ?? [];
  const hasFinesse = equipped.some(w => FINESSE_WEAPONS.some(f => w.toLowerCase().includes(f)));
  const hasRanged = equipped.some(w => RANGED_WEAPONS.some(r => w.toLowerCase().includes(r)));

  if (hasRanged) return "dexterity";
  if (hasFinesse) {
    return character.abilityScores.dexterity >= character.abilityScores.strength
      ? "dexterity" : "strength";
  }
  // Monks and Rogues prefer DEX
  if (character.class === "Monk" || character.class === "Rogue") {
    return character.abilityScores.dexterity >= character.abilityScores.strength
      ? "dexterity" : "strength";
  }
  return "strength";
}

// ── Damage type classification ───────────────────────────────────

/** Physical damage types that can be resisted/immune */
const PHYSICAL_DAMAGE_TYPES = ["bludgeoning", "piercing", "slashing"];

/**
 * Determine the damage type of the player's equipped weapon.
 * Falls back to "slashing" for most melee, "piercing" for ranged.
 */
function getPlayerDamageType(character: Character): string {
  const equipped = character.equipped ?? [];
  for (const item of equipped) {
    const info = getItemInfo(item);
    if (info?.category !== "weapon") continue;
    const lower = item.toLowerCase();
    // Piercing weapons
    if (["rapier", "dagger", "shortsword", "spear", "pike", "lance", "arrow", "bolt",
      "longbow", "shortbow", "crossbow", "javelin", "trident"].some(w => lower.includes(w))) {
      return "piercing";
    }
    // Bludgeoning weapons
    if (["mace", "hammer", "warhammer", "club", "greatclub", "maul", "flail",
      "morningstar", "quarterstaff", "sling"].some(w => lower.includes(w))) {
      return "bludgeoning";
    }
    // Default melee: slashing
    return "slashing";
  }
  // Unarmed: bludgeoning
  return "bludgeoning";
}

// ── Damage resistance/immunity application ───────────────────────

/**
 * Apply monster damage resistances and immunities.
 * Returns the final damage after modifications.
 */
function applyMonsterDefenses(
  rawDamage: number,
  damageType: string,
  monster: Monster,
): { finalDamage: number; resisted: boolean; immune: boolean } {
  const typeLower = damageType.toLowerCase();

  // Check immunities first — full negation
  const isImmune = monster.damageImmunities.some(imm => {
    const immLower = imm.toLowerCase();
    // Handle "bludgeoning, piercing, and slashing from nonmagical attacks"
    if (immLower.includes("nonmagical") && PHYSICAL_DAMAGE_TYPES.includes(typeLower)) {
      return true; // TODO: check if player weapon is magical
    }
    return immLower.includes(typeLower);
  });

  if (isImmune) {
    return { finalDamage: 0, resisted: false, immune: true };
  }

  // Check resistances — halve damage
  const isResisted = monster.damageResistances.some(res => {
    const resLower = res.toLowerCase();
    if (resLower.includes("nonmagical") && PHYSICAL_DAMAGE_TYPES.includes(typeLower)) {
      return true; // TODO: check if player weapon is magical
    }
    return resLower.includes(typeLower);
  });

  if (isResisted) {
    return { finalDamage: Math.floor(rawDamage / 2), resisted: true, immune: false };
  }

  return { finalDamage: rawDamage, resisted: false, immune: false };
}

// ── Combat initialization ────────────────────────────────────────

/**
 * Parse a COMBAT_START tag value to extract the enemy name.
 * Handles formats like:
 *   "Goblin Scout CR1/4"
 *   "Goblin"
 *   "Adult Red Dragon CR17"
 */
function parseEnemyName(combatStartValue: string): string {
  // Strip CR rating from the end
  const cleaned = combatStartValue
    .replace(/\s*CR\s*[\d/]+\s*$/i, "")
    .replace(/\s*\(CR\s*[\d/]+\)\s*$/i, "")
    .trim();
  return cleaned;
}

/**
 * Try to find a monster by name, with fuzzy fallbacks.
 * 1. Exact match via getMonsterByName
 * 2. Partial match — find monsters whose name contains the search term
 * 3. Fall back to a CR-appropriate random monster
 */
export function findMonster(name: string, playerLevel: number): Monster | null {
  // Exact match
  const exact = getMonsterByName(name);
  if (exact) return exact;

  // Partial match — scan all monsters
  const lower = name.toLowerCase();
  for (const monster of Object.values(MONSTER_DB) as Monster[]) {
    if (monster.name.toLowerCase().includes(lower) || lower.includes(monster.name.toLowerCase())) {
      return monster;
    }
  }

  // CR-appropriate fallback
  const targetCR = Math.max(0.25, Math.min(playerLevel, 5));
  const crMonsters = getMonstersByCR(targetCR);
  if (crMonsters.length > 0) {
    return crMonsters[Math.floor(Math.random() * crMonsters.length)];
  }

  // Last resort: CR 1/4 monsters
  const easyMonsters = getMonstersByCR(0.25);
  if (easyMonsters.length > 0) {
    return easyMonsters[Math.floor(Math.random() * easyMonsters.length)];
  }

  return null;
}

/**
 * Initialize combat from a COMBAT_START tag value.
 * Looks up the enemy in the monster DB and rolls initiative.
 */
export function initCombat(
  combatStartValue: string,
  character: Character,
): CombatState | null {
  const enemyName = parseEnemyName(combatStartValue);
  const monster = findMonster(enemyName, character.level);

  if (!monster) {
    console.warn(`[combat-engine] Could not find monster: "${enemyName}"`);
    return null;
  }

  // Roll initiative: d20 + DEX modifier
  const playerDexMod = modifier(character.abilityScores.dexterity);
  const enemyDexMod = modifier(monster.abilities.DEX);
  const playerInit = d20() + playerDexMod;
  const enemyInit = d20() + enemyDexMod;

  const initiativeOrder: ("player" | "enemy")[] =
    playerInit >= enemyInit ? ["player", "enemy"] : ["enemy", "player"];

  return {
    active: true,
    enemyName: monster.name,
    enemyKey: monster.name.toLowerCase().replace(/\s+/g, "-"),
    enemyHp: monster.hp,
    enemyMaxHp: monster.hp,
    enemyAc: monster.ac,
    roundNumber: 1,
    playerInitiative: playerInit,
    enemyInitiative: enemyInit,
    monster,
    playerCombatant: createDefaultCombatantState(),
    enemyCombatant: createDefaultCombatantState(),
    initiativeOrder,
    currentTurnIndex: 0,
    enemyRemainingAttacks: resolveMonsterMultiattack(monster.name),
    surpriseRound: false,
    surprisedSide: "none",
  };
}

// ── Saving throw proficiencies by class ──────────────────────────

export const SAVING_THROW_PROFICIENCIES: Record<string, [string, string]> = {
  Barbarian: ["strength", "constitution"],
  Bard: ["dexterity", "charisma"],
  Cleric: ["wisdom", "charisma"],
  Druid: ["intelligence", "wisdom"],
  Fighter: ["strength", "constitution"],
  Monk: ["strength", "dexterity"],
  Paladin: ["wisdom", "charisma"],
  Ranger: ["strength", "dexterity"],
  Rogue: ["dexterity", "intelligence"],
  Sorcerer: ["constitution", "charisma"],
  Warlock: ["wisdom", "charisma"],
  Wizard: ["intelligence", "wisdom"],
};

// ── Monster multiattack counts (SRD) ────────────────────────────

export const MONSTER_MULTIATTACK: Record<string, number> = {
  Wolf: 1,
  "Dire Wolf": 1,
  "Brown Bear": 2,
  "Giant Spider": 1,
  Bandit: 1,
  "Bandit Captain": 3,
  Thug: 2,
  Veteran: 3,
  Knight: 2,
  Gladiator: 3,
  Troll: 3,
  Ogre: 1,
  Giant: 2,
  Vampire: 3,
  Zombie: 1,
  Skeleton: 1,
  Ghoul: 2,
  Wight: 2,
  Wraith: 1,
  Shadow: 1,
  Specter: 1,
  Mummy: 2,
  Lich: 3,
  Dragon: 3,
  Hydra: 5,
};

// ── Monster special abilities ────────────────────────────────────

export interface MonsterSpecialAbility {
  type: "condition" | "save" | "effect";
  condition?: Condition;
  saveAbility?: string;
  saveDC?: number;
  durationTurns?: number;
  immuneRaces?: string[];
  description: string;
  /** For effect type: special mechanic name */
  effectName?: string;
  /** For regeneration-style effects */
  hpRegain?: number;
  /** Damage on failed save (dice notation) */
  damageDice?: string;
  /** Recharge mechanic (roll d6, recharge on N-6) */
  rechargeMin?: number;
}

export const MONSTER_SPECIAL_ABILITIES: Record<string, MonsterSpecialAbility> = {
  Ghoul: {
    type: "condition",
    condition: "paralyzed",
    saveAbility: "constitution",
    saveDC: 10,
    durationTurns: 10, // 1 minute = 10 rounds
    immuneRaces: ["Elf", "Half-Elf"],
    description: "Ghoul's claws carry a paralyzing toxin. CON save DC 10 or be paralyzed.",
  },
  "Giant Spider": {
    type: "condition",
    condition: "restrained",
    saveAbility: "strength",
    saveDC: 12,
    durationTurns: 1, // break free as action
    description: "Giant Spider's web restrains the target. STR save DC 12 to break free.",
  },
  Wolf: {
    type: "effect",
    effectName: "Pack Tactics",
    description: "Wolf has advantage on attack rolls when an ally is within 5 feet of the target.",
  },
  Zombie: {
    type: "effect",
    effectName: "Undead Fortitude",
    saveAbility: "constitution",
    saveDC: 5, // DC 5 + damage dealt
    description: "When reduced to 0 HP, CON save DC 5 + damage dealt. On success, stays at 1 HP (unless radiant or crit).",
  },
  Troll: {
    type: "effect",
    effectName: "Regeneration",
    hpRegain: 10,
    description: "Troll regains 10 HP at the start of each turn unless it took acid or fire damage this round.",
  },
  "Vampire Spawn": {
    type: "condition",
    condition: "charmed",
    saveAbility: "wisdom",
    saveDC: 17,
    durationTurns: 24, // 24 hours
    description: "Vampire's charm. WIS save DC 17 or be charmed.",
  },
  "Green Dragon": {
    type: "save",
    saveAbility: "constitution",
    saveDC: 14,
    damageDice: "12d6",
    rechargeMin: 5,
    description: "Poison Breath (Recharge 5-6). CON save DC 14, 12d6 poison damage, half on success.",
  },
};

// ── Condition mechanical effects ─────────────────────────────────

export interface ConditionEffect {
  attackAdvantage: "advantage" | "disadvantage" | "none";
  attackedAdvantage: "advantage" | "disadvantage" | "none";
  autoFailSaves?: string[];
  autoCritMelee?: boolean;
  speedZero?: boolean;
  incapacitated?: boolean;
  disadvantageOnChecks?: boolean;
  cannotMoveCloser?: boolean;
  standUpCost?: string;
  rangedDisadvantage?: boolean;
  description: string;
}

export const CONDITIONS_EFFECTS: Partial<Record<Condition, ConditionEffect>> = {
  prone: {
    attackAdvantage: "disadvantage",
    attackedAdvantage: "advantage", // melee within 5ft
    rangedDisadvantage: true,
    standUpCost: "half movement",
    description: "Attackers within 5 feet have advantage, ranged attackers have disadvantage. Costs half movement to stand up.",
  },
  restrained: {
    attackAdvantage: "disadvantage",
    attackedAdvantage: "advantage",
    autoFailSaves: ["dexterity"],
    speedZero: true,
    description: "Attackers have advantage. Creature has disadvantage on attacks and DEX saves. Speed becomes 0.",
  },
  paralyzed: {
    attackAdvantage: "none",
    attackedAdvantage: "advantage",
    autoFailSaves: ["strength", "dexterity"],
    autoCritMelee: true,
    incapacitated: true,
    description: "Incapacitated, auto-fail STR and DEX saves. Melee attacks within 5 feet auto-crit.",
  },
  grappled: {
    attackAdvantage: "none",
    attackedAdvantage: "none",
    speedZero: true,
    description: "Speed becomes 0. Ends if grappler is incapacitated.",
  },
  stunned: {
    attackAdvantage: "none",
    attackedAdvantage: "advantage",
    autoFailSaves: ["strength", "dexterity"],
    incapacitated: true,
    description: "Incapacitated, auto-fail STR and DEX saves. Attackers have advantage.",
  },
  poisoned: {
    attackAdvantage: "disadvantage",
    attackedAdvantage: "none",
    disadvantageOnChecks: true,
    description: "Disadvantage on attack rolls and ability checks.",
  },
  frightened: {
    attackAdvantage: "disadvantage",
    attackedAdvantage: "none",
    disadvantageOnChecks: true,
    cannotMoveCloser: true,
    description: "Disadvantage on attack rolls and ability checks while source of fear is in line of sight. Cannot move closer to source.",
  },
  blinded: {
    attackAdvantage: "disadvantage",
    attackedAdvantage: "advantage",
    description: "Auto-fails sight-based Perception. Attackers have advantage. Creature has disadvantage on attacks.",
  },
  invisible: {
    attackAdvantage: "advantage",
    attackedAdvantage: "disadvantage",
    description: "Attackers have disadvantage against it. Creature has advantage on attacks.",
  },
};

// ── Resolve condition saving throw ───────────────────────────────

export function resolveConditionSave(
  character: Character,
  condition: Condition,
  dc: number,
  proficiency: number,
): { success: boolean; roll: RollResult } {
  const saveProfs = SAVING_THROW_PROFICIENCIES[character.class] ?? [];
  // Determine the save ability based on common condition saves
  const saveAbility = condition === "paralyzed" || condition === "poisoned" || condition === "petrified"
    ? "constitution"
    : condition === "charmed" || condition === "frightened"
    ? "wisdom"
    : condition === "restrained" || condition === "prone"
    ? "strength"
    : "constitution";

  const abilityScore = character.abilityScores[saveAbility as keyof typeof character.abilityScores] ?? 10;
  const isProficient = saveProfs.includes(saveAbility);
  const prof = isProficient ? proficiency : 0;
  const lucky = character.race === "Halfling";

  const result = savingThrow(abilityScore, dc, saveAbility, prof, lucky);
  return { success: result.success, roll: result };
}

// ── Resolve concentration save ───────────────────────────────────

export function resolveConcentrationSave(
  character: Character,
  damageTaken: number,
): { success: boolean; concentrationBroke: boolean; roll: RollResult } {
  const dc = Math.max(10, Math.floor(damageTaken / 2));
  const saveProfs = SAVING_THROW_PROFICIENCIES[character.class] ?? [];
  const isProficient = saveProfs.includes("constitution");
  const profBonus = isProficient ? (Math.floor((character.level - 1) / 4) + 2) : 0;
  const lucky = character.race === "Halfling";

  const result = savingThrow(
    character.abilityScores.constitution,
    dc,
    "constitution",
    profBonus,
    lucky,
  );

  return {
    success: result.success,
    concentrationBroke: !result.success,
    roll: result,
  };
}

// ── Resolve monster special ability ──────────────────────────────

export function resolveMonsterSpecialAbility(
  monsterName: string,
  character: Character,
): { conditionApplied: Condition | null; duration: number; narrative: string } | null {
  const ability = MONSTER_SPECIAL_ABILITIES[monsterName];
  if (!ability) return null;

  // Recharge check for breath weapons
  if (ability.rechargeMin) {
    const rechargeRoll = Math.floor(Math.random() * 6) + 1;
    if (rechargeRoll < ability.rechargeMin) return null;
  }

  if (ability.type === "condition" && ability.condition && ability.saveAbility && ability.saveDC) {
    // Check racial immunity
    if (ability.immuneRaces?.includes(character.race)) {
      return {
        conditionApplied: null,
        duration: 0,
        narrative: `The ${monsterName}'s ${ability.description.split(".")[0]} has no effect — your ${character.race} heritage grants immunity.`,
      };
    }

    const abilityScore = character.abilityScores[ability.saveAbility as keyof typeof character.abilityScores] ?? 10;
    const saveProfs = SAVING_THROW_PROFICIENCIES[character.class] ?? [];
    const isProficient = saveProfs.includes(ability.saveAbility);
    const prof = isProficient ? (Math.floor((character.level - 1) / 4) + 2) : 0;
    const lucky = character.race === "Halfling";

    const result = savingThrow(abilityScore, ability.saveDC, ability.saveAbility, prof, lucky);

    if (!result.success) {
      return {
        conditionApplied: ability.condition,
        duration: ability.durationTurns ?? 1,
        narrative: `You fail the ${ability.saveAbility.toUpperCase()} save (${result.total} vs DC ${ability.saveDC}). You are ${ability.condition}!`,
      };
    }
    return {
      conditionApplied: null,
      duration: 0,
      narrative: `You resist the ${monsterName}'s special attack (${ability.saveAbility.toUpperCase()} save ${result.total} vs DC ${ability.saveDC}).`,
    };
  }

  if (ability.type === "effect") {
    return {
      conditionApplied: null,
      duration: 0,
      narrative: ability.description,
    };
  }

  if (ability.type === "save" && ability.saveAbility && ability.saveDC && ability.damageDice) {
    const abilityScore = character.abilityScores[ability.saveAbility as keyof typeof character.abilityScores] ?? 10;
    const saveProfs = SAVING_THROW_PROFICIENCIES[character.class] ?? [];
    const isProficient = saveProfs.includes(ability.saveAbility);
    const prof = isProficient ? (Math.floor((character.level - 1) / 4) + 2) : 0;
    const lucky = character.race === "Halfling";

    const result = savingThrow(abilityScore, ability.saveDC, ability.saveAbility, prof, lucky);
    // Damage dice are handled externally, just return the save result
    return {
      conditionApplied: null,
      duration: 0,
      narrative: result.success
        ? `You brace against the ${monsterName}'s breath weapon (${ability.saveAbility.toUpperCase()} save ${result.total} vs DC ${ability.saveDC}) — half damage!`
        : `You fail to dodge the ${monsterName}'s breath weapon (${ability.saveAbility.toUpperCase()} save ${result.total} vs DC ${ability.saveDC}) — full damage!`,
    };
  }

  return null;
}

// ── Resolve monster multiattack ──────────────────────────────────

export function resolveMonsterMultiattack(monsterName: string): number {
  // Check exact name first
  if (MONSTER_MULTIATTACK[monsterName] !== undefined) {
    return MONSTER_MULTIATTACK[monsterName];
  }
  // Check partial match (e.g. "Young White Dragon" matches "Dragon")
  for (const [key, count] of Object.entries(MONSTER_MULTIATTACK)) {
    if (monsterName.toLowerCase().includes(key.toLowerCase())) {
      return count;
    }
  }
  return 1; // default: single attack
}

// ── Resolve opportunity attack ───────────────────────────────────

export function resolveOpportunityAttack(
  character: Character,
  combatState: CombatState,
): { hit: boolean; damage: number; narrative: string } {
  const monster = combatState.monster;
  const attack = pickEnemyAttack(monster);
  if (!attack) return { hit: false, damage: 0, narrative: "" };

  const enemyRolled = d20();
  const enemyTotal = enemyRolled + attack.attackBonus;
  const hit = enemyRolled === 20 || (enemyRolled !== 1 && enemyTotal >= character.ac);

  if (!hit) {
    return {
      hit: false,
      damage: 0,
      narrative: `The ${monster.name} swings at you as you move away, but misses (${enemyTotal} vs AC ${character.ac}).`,
    };
  }

  const isCrit = enemyRolled === 20;
  const dmg = rollDamageDiceDetailed(attack.damageDice);
  let damage = isCrit ? dmg.dice.reduce((a, b) => a + b, 0) * 2 + dmg.bonus : dmg.total;
  damage = Math.max(1, damage);

  if (character.raging && PHYSICAL_DAMAGE_TYPES.includes(attack.damageType.toLowerCase())) {
    damage = Math.floor(damage / 2);
  }

  return {
    hit: true,
    damage,
    narrative: `The ${monster.name} catches you with an opportunity attack as you move away, dealing ${damage} damage!`,
  };
}

// ── Resolve death saving throw ───────────────────────────────────

export interface DeathSaveResult {
  roll: number;
  type: "nat20" | "nat1" | "success" | "failure";
  totalSuccesses: number;
  totalFailures: number;
  stabilized: boolean;
  revived: boolean;
  died: boolean;
}

export function resolveDeathSave(
  currentSuccesses: number,
  currentFailures: number,
): DeathSaveResult {
  const rolled = d20();
  let successes = currentSuccesses;
  let failures = currentFailures;
  let revived = false;
  let type: DeathSaveResult["type"];

  if (rolled === 20) {
    // Natural 20: regain 1 HP, wake up
    type = "nat20";
    revived = true;
    successes = 0;
    failures = 0;
  } else if (rolled === 1) {
    // Natural 1: two failures
    type = "nat1";
    failures += 2;
  } else if (rolled >= 10) {
    type = "success";
    successes += 1;
  } else {
    type = "failure";
    failures += 1;
  }

  return {
    roll: rolled,
    type,
    totalSuccesses: successes,
    totalFailures: failures,
    stabilized: successes >= 3,
    revived,
    died: failures >= 3,
  };
}

// ── Resolve grapple attempt ──────────────────────────────────────

export function resolveGrapple(
  character: Character,
  combatState: CombatState,
): { success: boolean; narrative: string } {
  const monster = combatState.monster;
  const prof = proficiencyBonus(character.level);
  const lucky = character.race === "Halfling";

  // Player Athletics check
  const strScore = character.abilityScores.strength;
  const playerRoll = (lucky ? (() => { const r = d20(); return r === 1 ? d20() : r; })() : d20())
    + modifier(strScore) + prof;

  // Monster Athletics or Acrobatics (use higher of STR or DEX)
  const monsterStr = modifier(monster.abilities.STR);
  const monsterDex = modifier(monster.abilities.DEX);
  const monsterRoll = d20() + Math.max(monsterStr, monsterDex);

  if (playerRoll >= monsterRoll) {
    return {
      success: true,
      narrative: `You grab hold of the ${monster.name} and wrestle it into a grapple! (${playerRoll} vs ${monsterRoll}). Its speed drops to 0.`,
    };
  }
  return {
    success: false,
    narrative: `You reach for the ${monster.name} but it wrenches free of your grip (${playerRoll} vs ${monsterRoll}).`,
  };
}

// ── Resolve shove attempt ────────────────────────────────────────

export function resolveShove(
  character: Character,
  combatState: CombatState,
  choice: "prone" | "push" = "prone",
): { success: boolean; narrative: string } {
  const monster = combatState.monster;
  const prof = proficiencyBonus(character.level);
  const lucky = character.race === "Halfling";

  const strScore = character.abilityScores.strength;
  const playerRoll = (lucky ? (() => { const r = d20(); return r === 1 ? d20() : r; })() : d20())
    + modifier(strScore) + prof;

  const monsterStr = modifier(monster.abilities.STR);
  const monsterDex = modifier(monster.abilities.DEX);
  const monsterRoll = d20() + Math.max(monsterStr, monsterDex);

  if (playerRoll >= monsterRoll) {
    const effect = choice === "prone"
      ? `knocking it prone`
      : `pushing it 5 feet away`;
    return {
      success: true,
      narrative: `You shove the ${monster.name}, ${effect}! (${playerRoll} vs ${monsterRoll})`,
    };
  }
  return {
    success: false,
    narrative: `You try to shove the ${monster.name} but it holds its ground (${playerRoll} vs ${monsterRoll}).`,
  };
}

// ── Resolve player spell cast in combat ──────────────────────────

export interface SpellCastResult {
  success: boolean;
  narrative: string;
  bonusActionSpellCast: boolean;
}

export function resolvePlayerCastSpell(
  character: Character,
  combatState: CombatState,
  spellName: string,
  isBonusAction: boolean,
  previousBonusActionSpell: boolean,
): SpellCastResult {
  // Bonus action spell restriction: if a bonus action spell was cast,
  // the action can only be a cantrip
  if (previousBonusActionSpell && !isBonusAction) {
    // This is the action after a bonus action spell — only cantrips allowed
    // The caller should check if the spell is a cantrip before calling this
  }

  // Concentration: new concentration spell ends the previous one
  if (combatState.playerCombatant.concentrationSpell) {
    const oldSpell = combatState.playerCombatant.concentrationSpell.spellName;
    combatState.playerCombatant.concentrationSpell = null;
    return {
      success: true,
      narrative: `You release concentration on ${oldSpell} and begin casting ${spellName}.`,
      bonusActionSpellCast: isBonusAction,
    };
  }

  return {
    success: true,
    narrative: `You cast ${spellName}.`,
    bonusActionSpellCast: isBonusAction,
  };
}

// ── Pick the best enemy attack ───────────────────────────────────

function pickEnemyAttack(monster: Monster): MonsterAttack | null {
  if (monster.attacks.length === 0) return null;

  // Pick the attack with the highest expected damage
  let best: MonsterAttack | null = null;
  let bestAvg = 0;

  for (const atk of monster.attacks) {
    const avg = parseDamageDiceAverage(atk.damageDice);
    if (avg > bestAvg) {
      bestAvg = avg;
      best = atk;
    }
  }

  return best ?? monster.attacks[0];
}

/**
 * Parse a damage dice string like "2d6+5" and return the average damage.
 */
function parseDamageDiceAverage(dice: string): number {
  const match = dice.match(/^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/);
  if (!match) return 4; // fallback
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;
  return count * (sides + 1) / 2 + bonus;
}

/**
 * Parse a damage dice string like "2d6+5" and roll it.
 */
function rollDamageDice(dice: string): RollResult {
  const match = dice.match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/);
  if (!match) return damageRoll(1, 4, 0); // fallback 1d4
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const sign = match[3] === "-" ? -1 : 1;
  const bonus = match[4] ? parseInt(match[4], 10) * sign : 0;
  return damageRoll(count, sides, bonus);
}

// ── Sneak Attack eligibility ─────────────────────────────────────

/** Rogues get Sneak Attack when using a finesse or ranged weapon */
function isSneakAttackEligible(character: Character): boolean {
  const equipped = character.equipped ?? [];
  const hasFinesseOrRanged = equipped.some(w => {
    const lower = w.toLowerCase();
    return FINESSE_WEAPONS.some(f => lower.includes(f))
      || RANGED_WEAPONS.some(r => lower.includes(r));
  });
  // Unarmed rogues with no finesse weapon don't qualify
  return hasFinesseOrRanged;
}

// ── Detailed damage dice roll (returns individual dice) ──────────

function rollDamageDiceDetailed(diceStr: string): { dice: number[]; bonus: number; total: number } {
  const match = diceStr.match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/);
  if (!match) return { dice: [4], bonus: 0, total: 4 }; // fallback 1d4
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const sign = match[3] === "-" ? -1 : 1;
  const bonus = match[4] ? parseInt(match[4], 10) * sign : 0;
  const dice = roll(count, sides);
  const total = Math.max(1, dice.reduce((a, b) => a + b, 0) + bonus);
  return { dice, bonus, total };
}

// ── Core combat round resolution ─────────────────────────────────

/**
 * Resolve a player attack action against the current enemy.
 * Uses the player's equipped weapon stats and the monster's SRD data.
 */
export function resolvePlayerAttack(
  character: Character,
  combatState: CombatState,
): CombatRoundResult {
  const monster = combatState.monster;
  const prof = proficiencyBonus(character.level);
  const atkAbility = getPlayerAttackAbility(character);
  const atkScore = character.abilityScores[atkAbility];
  const atkMod = modifier(atkScore);

  // Get weapon damage from equipped items
  const weaponDmg = getWeaponDamage(character.equipped ?? []);
  const dmgBonus = atkMod; // ability modifier added to damage
  const damageType = getPlayerDamageType(character);
  const isHalfling = character.race === "Halfling";
  const breakdown: DiceBreakdown = {};

  // Reset sneak attack tracking at start of round
  combatState.playerCombatant.sneakAttackUsedThisTurn = false;

  // ── Check player conditions that prevent attacking ─────────────
  const playerConditions = combatState.playerCombatant.conditions;
  if (playerConditions.has("paralyzed") || playerConditions.has("stunned") || playerConditions.has("incapacitated") || playerConditions.has("unconscious")) {
    // Player cannot attack — skip to enemy attacks
    const attack = pickEnemyAttack(monster);
    let enemyAtk: RollResult | null = null;
    let enemyDamage = 0;
    let playerHpChange = 0;

    if (attack) {
      const numAttacks = resolveMonsterMultiattack(monster.name);
      for (let i = 0; i < numAttacks; i++) {
        const enemyRolled = d20();
        const enemyTotal = enemyRolled + attack.attackBonus;
        // Paralyzed/stunned: attackers have advantage (simulated by taking better of two rolls)
        const advantageRoll = d20();
        const bestRoll = Math.max(enemyRolled, advantageRoll);
        const bestTotal = bestRoll + attack.attackBonus;
        // Auto-crit if paralyzed and melee
        const autoCrit = playerConditions.has("paralyzed");

        enemyAtk = {
          type: "attack",
          dc: character.ac,
          rolled: bestRoll,
          modifier: attack.attackBonus,
          total: bestTotal,
          success: bestRoll === 20 || autoCrit || (bestRoll !== 1 && bestTotal >= character.ac),
          reason: `${monster.name} ${attack.name} (attack ${i + 1}/${numAttacks})`,
        };

        if (enemyAtk.success) {
          const isCrit = bestRoll === 20 || autoCrit;
          const enemyDmgDice = rollDamageDiceDetailed(attack.damageDice);
          let thisDmg = isCrit
            ? (enemyDmgDice.dice.reduce((a, b) => a + b, 0) * 2 + enemyDmgDice.bonus)
            : enemyDmgDice.total;
          thisDmg = Math.max(1, thisDmg);
          if (character.raging && PHYSICAL_DAMAGE_TYPES.includes(attack.damageType.toLowerCase())) {
            thisDmg = Math.floor(thisDmg / 2);
          }
          enemyDamage += thisDmg;
        }
      }
      playerHpChange = -enemyDamage;
    }

    const playerDown = (character.hp + playerHpChange) <= 0;
    const conditionName = playerConditions.has("paralyzed") ? "paralyzed" : playerConditions.has("stunned") ? "stunned" : "incapacitated";
    const updatedCombatState: CombatState = {
      ...combatState,
      roundNumber: combatState.roundNumber + 1,
      active: !playerDown,
    };

    return {
      narrative: `You are ${conditionName} and cannot act! The ${monster.name} takes advantage of your helplessness${enemyDamage > 0 ? `, dealing ${enemyDamage} total damage` : ""}.`,
      diceBreakdown: breakdown,
      playerAttack: null,
      playerDamage: 0,
      playerDamageResisted: false,
      playerDamageImmune: false,
      enemyAttack: enemyAtk,
      enemyDamage,
      combatState: updatedCombatState,
      playerHpChange,
      xpAwarded: 0,
      goldDropped: 0,
      itemsDropped: [],
      lootNarrative: "",
      combatOver: playerDown,
      combatEndReason: playerDown ? "player_down" : "ongoing",
    };
  }

  // ── Player attack (check prone/condition modifiers) ─────────────
  const playerAtk = attackRoll(atkScore, monster.ac, prof, isHalfling);
  let playerDamage = 0;
  let playerDamageResisted = false;
  let playerDamageImmune = false;
  let sneakAttackDice: number[] | undefined;

  breakdown.playerAttackRoll = {
    d20: playerAtk.rolled,
    modifier: playerAtk.modifier,
    total: playerAtk.total,
    targetAC: monster.ac,
    hit: playerAtk.success,
    crit: playerAtk.rolled === 20,
  };

  if (playerAtk.success) {
    const isCrit = playerAtk.rolled === 20;
    const diceCount = isCrit ? weaponDmg.dice * 2 : weaponDmg.dice;
    const weaponDice = roll(diceCount, weaponDmg.sides);
    let rawDamage = weaponDice.reduce((a, b) => a + b, 0) + dmgBonus;

    // ── Sneak Attack: Rogues deal extra 1d6 damage ──────────────
    // Only once per round (tracked by sneakAttackUsedThisTurn)
    if (character.class === "Rogue" && isSneakAttackEligible(character) && !combatState.playerCombatant.sneakAttackUsedThisTurn) {
      const sneakDiceCount = isCrit ? 2 : 1; // double on crit
      sneakAttackDice = roll(sneakDiceCount, 6);
      rawDamage += sneakAttackDice.reduce((a, b) => a + b, 0);
      combatState.playerCombatant.sneakAttackUsedThisTurn = true;
    }

    rawDamage = Math.max(1, rawDamage); // minimum 1 damage

    // Apply monster resistances/immunities
    const defense = applyMonsterDefenses(rawDamage, damageType, monster);
    playerDamage = defense.finalDamage;
    playerDamageResisted = defense.resisted;
    playerDamageImmune = defense.immune;

    breakdown.playerDamageRoll = {
      dice: weaponDice,
      bonus: dmgBonus,
      rawTotal: rawDamage,
      sneakAttackDice,
      damageType,
      resisted: defense.resisted,
      immune: defense.immune,
      finalDamage: defense.finalDamage,
    };
  }

  // Apply damage to enemy
  const newEnemyHp = Math.max(0, combatState.enemyHp - playerDamage);

  // ── Enemy attacks with multiattack (if still alive) ────────────
  let enemyAtk: RollResult | null = null;
  let enemyDamage = 0;
  let playerHpChange = 0;
  let specialAbilityNarrative = "";

  if (newEnemyHp > 0) {
    const attack = pickEnemyAttack(monster);
    if (attack) {
      const numAttacks = resolveMonsterMultiattack(monster.name);

      for (let i = 0; i < numAttacks; i++) {
        // Check if enemy is prone/restrained (disadvantage on attacks)
        const enemyConditions = combatState.enemyCombatant.conditions;
        let enemyRolled: number;
        if (enemyConditions.has("prone") || enemyConditions.has("restrained") || enemyConditions.has("poisoned") || enemyConditions.has("frightened") || enemyConditions.has("blinded")) {
          // Disadvantage: roll twice, take lower
          const r1 = d20();
          const r2 = d20();
          enemyRolled = Math.min(r1, r2);
        } else {
          enemyRolled = d20();
        }

        // Player prone: melee attackers have advantage, ranged have disadvantage
        if (playerConditions.has("prone")) {
          const advantageRoll = d20();
          enemyRolled = Math.max(enemyRolled, advantageRoll); // advantage for melee
        }

        const enemyTotal = enemyRolled + attack.attackBonus;
        enemyAtk = {
          type: "attack",
          dc: character.ac,
          rolled: enemyRolled,
          modifier: attack.attackBonus,
          total: enemyTotal,
          success: enemyRolled === 20 || (enemyRolled !== 1 && enemyTotal >= character.ac),
          reason: `${monster.name} ${attack.name} (attack ${i + 1}/${numAttacks})`,
        };

        if (i === 0) {
          breakdown.enemyAttackRoll = {
            d20: enemyRolled,
            modifier: attack.attackBonus,
            total: enemyTotal,
            targetAC: character.ac,
            hit: enemyAtk.success,
            crit: enemyRolled === 20,
            attackName: `${attack.name}${numAttacks > 1 ? ` (×${numAttacks})` : ""}`,
          };
        }

        if (enemyAtk.success) {
          const isCrit = enemyRolled === 20;
          const enemyDmgDice = rollDamageDiceDetailed(attack.damageDice);
          let thisDmg = isCrit
            ? (enemyDmgDice.dice.reduce((a, b) => a + b, 0) * 2 + enemyDmgDice.bonus)
            : enemyDmgDice.total;
          thisDmg = Math.max(1, thisDmg);

          // Barbarian rage: halve physical damage
          if (character.raging && PHYSICAL_DAMAGE_TYPES.includes(attack.damageType.toLowerCase())) {
            thisDmg = Math.floor(thisDmg / 2);
          }
          enemyDamage += thisDmg;

          // Apply monster special ability after each hit
          const specialResult = resolveMonsterSpecialAbility(monster.name, character);
          if (specialResult) {
            specialAbilityNarrative += " " + specialResult.narrative;
            if (specialResult.conditionApplied) {
              combatState.playerCombatant.conditions.add(specialResult.conditionApplied);
              combatState.playerCombatant.turnsUntilConditionExpires[specialResult.conditionApplied] = specialResult.duration;
            }
          }

          if (i === 0) {
            breakdown.enemyDamageRoll = {
              dice: enemyDmgDice.dice,
              bonus: enemyDmgDice.bonus,
              total: enemyDamage,
              damageType: attack.damageType,
            };
          }
        }
      }
      playerHpChange = -enemyDamage;

      // ── Concentration save if player takes damage ──────────────
      if (enemyDamage > 0 && combatState.playerCombatant.concentrationSpell) {
        const concResult = resolveConcentrationSave(character, enemyDamage);
        if (concResult.concentrationBroke) {
          const spellName = combatState.playerCombatant.concentrationSpell.spellName;
          combatState.playerCombatant.concentrationSpell = null;
          specialAbilityNarrative += ` Your concentration on ${spellName} breaks!`;
        }
      }
    }
  }

  // ── Build updated combat state ─────────────────────────────────
  const enemyKilled = newEnemyHp <= 0;
  const playerDown = (character.hp + playerHpChange) <= 0;
  let combatEndReason: CombatRoundResult["combatEndReason"] = "ongoing";
  let xpAwarded = 0;
  let goldDropped = 0;
  let itemsDropped: string[] = [];
  let lootNarrative = "";

  if (enemyKilled) {
    combatEndReason = "enemy_killed";
    xpAwarded = monster.xpReward;
    const loot = generateLoot(monster);
    goldDropped = loot.gold;
    itemsDropped = loot.items;
    lootNarrative = loot.narrative;
  } else if (playerDown) {
    combatEndReason = "player_down";
  }

  // Increment round number — a full round is both sides acting
  const updatedCombatState: CombatState = {
    ...combatState,
    enemyHp: newEnemyHp,
    roundNumber: combatState.roundNumber + 1,
    active: combatEndReason === "ongoing",
    enemyRemainingAttacks: resolveMonsterMultiattack(monster.name),
  };

  // Tick condition durations
  for (const [cond, turns] of Object.entries(updatedCombatState.playerCombatant.turnsUntilConditionExpires)) {
    if (turns !== undefined && turns > 0) {
      updatedCombatState.playerCombatant.turnsUntilConditionExpires[cond as Condition] = turns - 1;
    } else if (turns !== undefined && turns <= 0) {
      updatedCombatState.playerCombatant.conditions.delete(cond as Condition);
      delete updatedCombatState.playerCombatant.turnsUntilConditionExpires[cond as Condition];
    }
  }

  // Reset per-turn flags
  updatedCombatState.playerCombatant.reactionUsed = false;
  updatedCombatState.playerCombatant.bonusActionUsed = false;
  updatedCombatState.enemyCombatant.reactionUsed = false;

  // ── Build narrative ────────────────────────────────────────────
  const isCrit = playerAtk.rolled === 20 && playerAtk.success;
  let narrative = buildCombatNarrative({
    playerAtk, playerDamage, playerDamageResisted, playerDamageImmune,
    enemyAtk, enemyDamage, monster, character,
    enemyHpRemaining: newEnemyHp, enemyKilled, playerDown,
    isCrit, damageType, sneakAttackDice,
    xpAwarded, goldDropped, itemsDropped, lootNarrative,
  });

  if (specialAbilityNarrative) {
    narrative += specialAbilityNarrative;
  }

  return {
    narrative,
    diceBreakdown: breakdown,
    playerAttack: playerAtk,
    playerDamage,
    playerDamageResisted,
    playerDamageImmune,
    enemyAttack: enemyAtk,
    enemyDamage,
    combatState: updatedCombatState,
    playerHpChange,
    xpAwarded,
    goldDropped,
    itemsDropped,
    lootNarrative,
    combatOver: combatEndReason !== "ongoing",
    combatEndReason,
  };
}

/**
 * Resolve a player flee attempt. DEX check vs DC 10 + monster DEX modifier.
 * On success, combat ends. On failure, the enemy gets a free attack.
 */
export function resolvePlayerFlee(
  character: Character,
  combatState: CombatState,
): CombatRoundResult {
  const monster = combatState.monster;
  const prof = proficiencyBonus(character.level);
  const isHalfling = character.race === "Halfling";
  const fleeDC = 10 + Math.max(0, modifier(monster.abilities.DEX));

  const fleeRolled = isHalfling ? (() => { const r = d20(); return r === 1 ? d20() : r; })() : d20();
  const fleeMod = modifier(character.abilityScores.dexterity) + (character.skillProficiencies?.includes("Athletics") ? prof : 0);
  const fleeTotal = fleeRolled + fleeMod;
  const fleeSuccess = fleeTotal >= fleeDC;

  let enemyAtk: RollResult | null = null;
  let enemyDamage = 0;
  let playerHpChange = 0;

  if (!fleeSuccess) {
    // Failed to flee — enemy gets a free attack (opportunity attack)
    const attack = pickEnemyAttack(monster);
    if (attack) {
      const enemyRolled = d20();
      const enemyTotal = enemyRolled + attack.attackBonus;
      enemyAtk = {
        type: "attack",
        dc: character.ac,
        rolled: enemyRolled,
        modifier: attack.attackBonus,
        total: enemyTotal,
        success: enemyRolled === 20 || (enemyRolled !== 1 && enemyTotal >= character.ac),
        reason: `${monster.name} opportunity attack`,
      };

      if (enemyAtk.success) {
        const dmgRoll = rollDamageDice(attack.damageDice);
        enemyDamage = dmgRoll.total;
        if (character.raging && PHYSICAL_DAMAGE_TYPES.includes(attack.damageType.toLowerCase())) {
          enemyDamage = Math.floor(enemyDamage / 2);
        }
        playerHpChange = -enemyDamage;
      }
    }
  }

  const combatEndReason: CombatRoundResult["combatEndReason"] = fleeSuccess ? "player_fled" : "ongoing";
  const playerDown = (character.hp + playerHpChange) <= 0;

  const updatedCombatState: CombatState = {
    ...combatState,
    roundNumber: combatState.roundNumber + 1,
    active: !fleeSuccess && !playerDown,
  };

  let narrative: string;
  if (fleeSuccess) {
    narrative = `You turn and sprint, putting distance between yourself and the ${monster.name}. Your feet find purchase and you escape into the shadows, heart pounding.`;
  } else {
    narrative = `You try to disengage but the ${monster.name} is too quick.`;
    if (enemyAtk?.success) {
      narrative += ` It catches you with a vicious strike as you turn, dealing ${enemyDamage} damage.`;
    } else if (enemyAtk) {
      narrative += ` It swings at your back but the blow goes wide.`;
    }
  }

  return {
    narrative,
    playerAttack: null,
    playerDamage: 0,
    playerDamageResisted: false,
    playerDamageImmune: false,
    enemyAttack: enemyAtk,
    enemyDamage,
    combatState: updatedCombatState,
    playerHpChange,
    xpAwarded: 0,
    goldDropped: 0,
    itemsDropped: [],
    lootNarrative: "",
    diceBreakdown: {},
    combatOver: fleeSuccess || playerDown,
    combatEndReason: playerDown ? "player_down" : combatEndReason,
  };
}

// ── Combat action detection ──────────────────────────────────────

export type CombatAction = "attack" | "flee" | "other";

/**
 * Detect what combat action the player is taking from their input.
 */
export function detectCombatAction(playerInput: string): CombatAction {
  const lower = playerInput.toLowerCase();
  const attackWords = ["attack", "strike", "hit", "slash", "stab", "swing", "shoot",
    "fire", "cast", "smite", "cleave", "punch", "kick", "throw", "bash"];
  const fleeWords = ["flee", "run", "escape", "disengage", "retreat", "sprint away", "get away"];

  if (fleeWords.some(w => lower.includes(w))) return "flee";
  if (attackWords.some(w => lower.includes(w))) return "attack";
  return "other";
}

/**
 * Detect if the player is attacking a named target and extract the target name.
 * Returns the target name or null if no attack target detected.
 *
 * Handles patterns like:
 *   "I attack the goblin"
 *   "strike the dire wolf"
 *   "shoot an arrow at the bandit captain"
 *   "cast fireball at the troll"
 *   "slash the skeleton with my sword"
 */
export function detectAttackTarget(playerInput: string): string | null {
  const lower = playerInput.toLowerCase().trim();

  // Attack verb patterns — verb followed by target
  const patterns = [
    // "attack/strike/hit/stab/slash/shoot/bash/smite/cleave the <target>"
    /\b(?:attack|strike|hit|stab|slash|shoot|bash|smite|cleave|punch|kick)\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:\s+with\b|\s+using\b|[.!?,]|$)/i,
    // "cast <spell> at the <target>"  or  "cast at the <target>"
    /\bcast\b.*?\bat\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:\s+with\b|\s+using\b|[.!?,]|$)/i,
    // "fire at the <target>"  or  "throw <weapon> at the <target>"
    /\b(?:fire|throw|hurl|launch)\b.*?\bat\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:\s+with\b|\s+using\b|[.!?,]|$)/i,
    // "swing at the <target>"
    /\bswing\b.*?\bat\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:\s+with\b|\s+using\b|[.!?,]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      // Clean up the target name
      let target = match[1].trim();
      // Remove trailing prepositions and common suffixes
      target = target.replace(/\s+(?:with|using|and|then|before|after|while|in|on|from|to).*$/i, "").trim();
      // Remove trailing punctuation
      target = target.replace(/[.!?,;:]+$/, "").trim();
      if (target.length >= 2 && target.length <= 50) {
        return target;
      }
    }
  }

  return null;
}

/**
 * Resolve a full combat turn based on the player's action.
 */
export function resolveCombatTurn(
  playerInput: string,
  character: Character,
  combatState: CombatState,
): CombatRoundResult {
  const action = detectCombatAction(playerInput);

  switch (action) {
    case "flee":
      return resolvePlayerFlee(character, combatState);
    case "attack":
    case "other":
      // Default to attack if action is unclear during combat
      return resolvePlayerAttack(character, combatState);
  }
}

// ── Narrative generation ─────────────────────────────────────────

interface NarrativeParams {
  playerAtk: RollResult;
  playerDamage: number;
  playerDamageResisted: boolean;
  playerDamageImmune: boolean;
  enemyAtk: RollResult | null;
  enemyDamage: number;
  monster: Monster;
  character: Character;
  enemyHpRemaining: number;
  enemyKilled: boolean;
  playerDown: boolean;
  isCrit: boolean;
  damageType: string;
  sneakAttackDice?: number[];
  xpAwarded: number;
  goldDropped: number;
  itemsDropped: string[];
  lootNarrative: string;
}

function buildCombatNarrative(p: NarrativeParams): string {
  const parts: string[] = [];
  const monsterName = p.monster.name;

  // Player attack result
  if (p.playerAtk.success) {
    if (p.isCrit) {
      parts.push(`A devastating critical hit! Your weapon finds a vital weak point on the ${monsterName}.`);
    } else {
      parts.push(`Your attack strikes the ${monsterName} (${p.playerAtk.total} vs AC ${p.monster.ac}).`);
    }

    // Sneak Attack narration
    if (p.sneakAttackDice && p.sneakAttackDice.length > 0) {
      const sneakTotal = p.sneakAttackDice.reduce((a, b) => a + b, 0);
      parts.push(`You exploit an opening — Sneak Attack adds ${sneakTotal} damage!`);
    }

    if (p.playerDamageImmune) {
      parts.push(`But the ${monsterName} is completely immune to ${p.damageType} damage — your blow has no effect.`);
    } else if (p.playerDamageResisted) {
      parts.push(`The ${monsterName} resists ${p.damageType} damage — only ${p.playerDamage} damage gets through.`);
    } else {
      parts.push(`You deal ${p.playerDamage} ${p.damageType} damage.`);
    }
  } else {
    if (p.playerAtk.rolled === 1) {
      parts.push(`Your attack goes wildly off-mark — a critical miss!`);
    } else {
      parts.push(`Your attack misses the ${monsterName} (${p.playerAtk.total} vs AC ${p.monster.ac}).`);
    }
  }

  // Enemy killed
  if (p.enemyKilled) {
    parts.push(`The ${monsterName} collapses, defeated!`);
    if (p.xpAwarded > 0) parts.push(`You earn ${p.xpAwarded} XP.`);
    if (p.lootNarrative) parts.push(p.lootNarrative);
    return parts.join(" ");
  }

  // Enemy HP status
  const hpPct = p.enemyHpRemaining / p.monster.hp;
  if (hpPct <= 0.25) {
    parts.push(`The ${monsterName} staggers, barely standing.`);
  } else if (hpPct <= 0.5) {
    parts.push(`The ${monsterName} is visibly wounded.`);
  }

  // Enemy attack
  if (p.enemyAtk) {
    if (p.enemyAtk.success) {
      if (p.enemyAtk.rolled === 20) {
        parts.push(`The ${monsterName} lands a critical blow, dealing ${p.enemyDamage} damage!`);
      } else {
        parts.push(`The ${monsterName} strikes you for ${p.enemyDamage} damage (${p.enemyAtk.total} vs AC ${p.character.ac}).`);
      }
    } else {
      parts.push(`The ${monsterName} attacks but misses (${p.enemyAtk.total} vs AC ${p.character.ac}).`);
    }
  }

  if (p.playerDown) {
    parts.push(`The blow sends you crashing to the ground. Darkness creeps in at the edges of your vision.`);
  }

  return parts.join(" ");
}

// ── Encounter generation by location ─────────────────────────────

const LOCATION_ENCOUNTERS: Record<string, { crMin: number; crMax: number; types: string[] }> = {
  forest: { crMin: 0.125, crMax: 2, types: ["beast", "plant", "fey", "monstrosity"] },
  dungeon: { crMin: 0.25, crMax: 5, types: ["undead", "aberration", "ooze", "construct", "monstrosity"] },
  ruins: { crMin: 0.5, crMax: 4, types: ["undead", "construct", "monstrosity", "aberration"] },
  docks: { crMin: 0.125, crMax: 1, types: ["humanoid", "beast", "monstrosity"] },
  alley: { crMin: 0.125, crMax: 1, types: ["humanoid", "beast"] },
  warehouse: { crMin: 0.25, crMax: 2, types: ["humanoid", "beast", "monstrosity"] },
  cave: { crMin: 0.25, crMax: 3, types: ["beast", "monstrosity", "ooze", "aberration"] },
  swamp: { crMin: 0.25, crMax: 3, types: ["beast", "plant", "undead", "monstrosity"] },
  mountain: { crMin: 0.5, crMax: 4, types: ["beast", "giant", "dragon", "elemental"] },
  desert: { crMin: 0.25, crMax: 3, types: ["beast", "monstrosity", "elemental", "undead"] },
  cemetery: { crMin: 0.25, crMax: 3, types: ["undead", "fiend"] },
  bazaar: { crMin: 0.125, crMax: 1, types: ["humanoid"] },
  outskirts: { crMin: 0.125, crMax: 2, types: ["beast", "humanoid", "monstrosity"] },
};

/**
 * Pick a CR-appropriate and location-thematic monster for a random encounter.
 * Scales with player level.
 */
export function pickEncounterMonster(location: string, playerLevel: number): Monster | null {
  const locLower = location.toLowerCase();

  // Find matching location config
  let config = Object.entries(LOCATION_ENCOUNTERS).find(([key]) => locLower.includes(key))?.[1];
  if (!config) {
    // Default: generic encounter
    config = { crMin: 0.125, crMax: Math.min(playerLevel, 3), types: ["beast", "humanoid", "monstrosity"] };
  }

  // Scale CR range with player level
  const levelScaledMax = Math.min(config.crMax, Math.max(1, playerLevel + 1));

  // Gather all candidates matching type and CR range
  const allMonsters = Object.values(MONSTER_DB) as Monster[];
  const candidates = allMonsters.filter(m =>
    m.cr >= config!.crMin &&
    m.cr <= levelScaledMax &&
    config!.types.includes(m.type)
  );

  if (candidates.length === 0) {
    // Fallback: any monster in CR range
    const fallback = allMonsters.filter(m => m.cr >= config!.crMin && m.cr <= levelScaledMax);
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}
