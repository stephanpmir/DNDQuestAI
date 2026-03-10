import type { RollResult } from "@/types/world";

/** Roll NdS: e.g. roll(1, 20) for 1d20, roll(4, 6) for 4d6 */
export function roll(count: number, sides: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }
  return results;
}

/** Single die roll */
export function d(sides: number): number {
  return roll(1, sides)[0];
}

export function d20(): number {
  return d(20);
}

/** Ability score modifier */
export function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Perform an ability check: d20 + ability modifier + proficiency bonus vs DC
 * D&D 5e: Total = d20 + ability mod + proficiency (if proficient)
 */
export function abilityCheck(
  abilityScore: number,
  dc: number,
  ability: string,
  proficiencyBonus: number = 0
): RollResult {
  const rolled = d20();
  const mod = modifier(abilityScore) + proficiencyBonus;
  const total = rolled + mod;
  return {
    type: "check",
    ability,
    dc,
    rolled,
    modifier: mod,
    total,
    success: total >= dc,
  };
}

/** Perform a saving throw: d20 + modifier vs DC */
export function savingThrow(
  abilityScore: number,
  dc: number,
  ability: string,
  proficiencyBonus: number = 0
): RollResult {
  const rolled = d20();
  const mod = modifier(abilityScore) + proficiencyBonus;
  const total = rolled + mod;
  return {
    type: "save",
    ability,
    dc,
    rolled,
    modifier: mod,
    total,
    success: total >= dc,
  };
}

/**
 * Attack roll: d20 + ability modifier + proficiency bonus vs target AC
 * D&D 5e: Natural 20 always hits, Natural 1 always misses
 */
export function attackRoll(
  abilityScore: number,
  targetAC: number,
  proficiencyBonus: number = 0
): RollResult {
  const rolled = d20();
  const mod = modifier(abilityScore) + proficiencyBonus;
  const total = rolled + mod;
  return {
    type: "attack",
    dc: targetAC,
    rolled,
    modifier: mod,
    total,
    // D&D 5e: nat 20 always hits, nat 1 always misses
    success: rolled === 20 || (rolled !== 1 && total >= targetAC),
  };
}

/** Damage roll: roll dice and return total (minimum 1) */
export function damageRoll(count: number, sides: number, bonus: number = 0): RollResult {
  const dice = roll(count, sides);
  const rawTotal = dice.reduce((a, b) => a + b, 0) + bonus;
  const total = Math.max(1, rawTotal); // Damage is always at least 1
  return {
    type: "damage",
    rolled: dice.reduce((a, b) => a + b, 0),
    modifier: bonus,
    total,
    success: true,
  };
}
