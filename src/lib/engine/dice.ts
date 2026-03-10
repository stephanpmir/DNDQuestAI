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

/** Perform an ability check: d20 + modifier vs DC */
export function abilityCheck(
  abilityScore: number,
  dc: number,
  ability: string
): RollResult {
  const rolled = d20();
  const mod = modifier(abilityScore);
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
  ability: string
): RollResult {
  const rolled = d20();
  const mod = modifier(abilityScore);
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

/** Attack roll: d20 + modifier vs target AC */
export function attackRoll(
  abilityScore: number,
  targetAC: number
): RollResult {
  const rolled = d20();
  const mod = modifier(abilityScore);
  const total = rolled + mod;
  return {
    type: "attack",
    dc: targetAC,
    rolled,
    modifier: mod,
    total,
    success: total >= targetAC,
  };
}

/** Damage roll: roll dice and return total */
export function damageRoll(count: number, sides: number, bonus: number = 0): RollResult {
  const dice = roll(count, sides);
  const total = dice.reduce((a, b) => a + b, 0) + bonus;
  return {
    type: "damage",
    rolled: dice.reduce((a, b) => a + b, 0),
    modifier: bonus,
    total,
    success: true,
  };
}
