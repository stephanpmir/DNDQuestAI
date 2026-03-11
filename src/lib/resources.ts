import type { CharacterClass } from "@/types/character";

/**
 * Resource tracking for D&D 5e class features.
 *
 * Each resource has a current and max value. Resources recharge on
 * short rest or long rest depending on the class feature.
 */

export type RestType = "short" | "long";

export interface Resource {
  /** Unique key identifying this resource */
  key: string;
  /** Display label shown in the sidebar */
  label: string;
  /** Current available uses */
  current: number;
  /** Maximum uses */
  max: number;
  /** When this resource recharges */
  rechargesOn: RestType;
}

/** All resource pools on a character */
export type ResourcePool = Resource[];

// ── Spell slot tables (5e PHB) ─────────────────────────────────────

/** Full caster spell slots by level (levels 1-20, slot levels 1-9) */
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [2],
  2:  [3],
  3:  [4, 2],
  4:  [4, 3],
  5:  [4, 3, 2],
  6:  [4, 3, 3],
  7:  [4, 3, 3, 1],
  8:  [4, 3, 3, 2],
  9:  [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/** Half caster spell slots by level (start at level 2) */
const HALF_CASTER_SLOTS: Record<number, number[]> = {
  2:  [2],
  3:  [3],
  4:  [3],
  5:  [4, 2],
  6:  [4, 2],
  7:  [4, 3],
  8:  [4, 3],
  9:  [4, 3, 2],
  10: [4, 3, 2],
  11: [4, 3, 3],
  12: [4, 3, 3],
  13: [4, 3, 3, 1],
  14: [4, 3, 3, 1],
  15: [4, 3, 3, 2],
  16: [4, 3, 3, 2],
  17: [4, 3, 3, 3, 1],
  18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2],
  20: [4, 3, 3, 3, 2],
};

/** Warlock pact magic slots by level */
const WARLOCK_SLOTS: Record<number, { count: number; level: number }> = {
  1:  { count: 1, level: 1 },
  2:  { count: 2, level: 1 },
  3:  { count: 2, level: 2 },
  4:  { count: 2, level: 2 },
  5:  { count: 2, level: 3 },
  6:  { count: 2, level: 3 },
  7:  { count: 2, level: 4 },
  8:  { count: 2, level: 4 },
  9:  { count: 2, level: 5 },
  10: { count: 2, level: 5 },
  11: { count: 3, level: 5 },
  12: { count: 3, level: 5 },
  13: { count: 3, level: 5 },
  14: { count: 3, level: 5 },
  15: { count: 3, level: 5 },
  16: { count: 3, level: 5 },
  17: { count: 4, level: 5 },
  18: { count: 4, level: 5 },
  19: { count: 4, level: 5 },
  20: { count: 4, level: 5 },
};

const FULL_CASTERS: CharacterClass[] = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"];
const HALF_CASTERS: CharacterClass[] = ["Paladin", "Ranger"];

/**
 * Build the initial resource pool for a character based on class, race, and level.
 */
export function buildResourcePool(
  cls: CharacterClass,
  race: string,
  level: number,
): ResourcePool {
  const resources: ResourcePool = [];

  // ── Fighter: Second Wind (1/short rest) ──
  if (cls === "Fighter") {
    resources.push({
      key: "second_wind",
      label: "Second Wind",
      current: 1,
      max: 1,
      rechargesOn: "short",
    });
  }

  // ── Dragonborn: Breath Weapon (1/short rest) ──
  if (race === "Dragonborn") {
    resources.push({
      key: "breath_weapon",
      label: "Breath Weapon",
      current: 1,
      max: 1,
      rechargesOn: "short",
    });
  }

  // ── Cleric: Channel Divinity (1/short rest, 2 at level 6, 3 at level 18) ──
  if (cls === "Cleric" && level >= 2) {
    const uses = level >= 18 ? 3 : level >= 6 ? 2 : 1;
    resources.push({
      key: "channel_divinity",
      label: "Channel Divinity",
      current: uses,
      max: uses,
      rechargesOn: "short",
    });
  }

  // ── Paladin: Channel Divinity (1/short rest) + Lay on Hands (5 × level / long rest) ──
  if (cls === "Paladin" && level >= 2) {
    resources.push({
      key: "channel_divinity",
      label: "Channel Divinity",
      current: 1,
      max: 1,
      rechargesOn: "short",
    });
  }
  if (cls === "Paladin") {
    const pool = 5 * level;
    resources.push({
      key: "lay_on_hands",
      label: "Lay on Hands",
      current: pool,
      max: pool,
      rechargesOn: "long",
    });
  }

  // ── Druid: Wild Shape (2/short rest, level 2+) ──
  if (cls === "Druid" && level >= 2) {
    resources.push({
      key: "wild_shape",
      label: "Wild Shape",
      current: 2,
      max: 2,
      rechargesOn: "short",
    });
  }

  // ── Monk: Ki Points (level × 1 / long rest, level 2+) ──
  if (cls === "Monk" && level >= 2) {
    resources.push({
      key: "ki",
      label: "Ki Points",
      current: level,
      max: level,
      rechargesOn: "short",
    });
  }

  // ── Barbarian: Rage (uses / long rest) ──
  if (cls === "Barbarian") {
    const rages = level >= 20 ? Infinity : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
    resources.push({
      key: "rage",
      label: "Rage",
      current: rages,
      max: rages,
      rechargesOn: "long",
    });
  }

  // ── Bard: Bardic Inspiration (CHA mod / long rest, short rest at L5+) ──
  if (cls === "Bard") {
    // At character creation we don't know CHA yet, so default to 3 uses
    // This gets recalculated in recalculateResources when we have ability scores
    resources.push({
      key: "bardic_inspiration",
      label: "Bardic Inspiration",
      current: 3,
      max: 3,
      rechargesOn: level >= 5 ? "short" : "long",
    });
  }

  // ── Warlock: Pact Magic Slots (recharge on short rest) ──
  if (cls === "Warlock") {
    const pact = WARLOCK_SLOTS[level] ?? WARLOCK_SLOTS[1];
    resources.push({
      key: "pact_slots",
      label: `Pact Slots (Lv ${pact.level})`,
      current: pact.count,
      max: pact.count,
      rechargesOn: "short",
    });
  }

  // ── Full Casters: Spell Slots (recharge on long rest) ──
  if (FULL_CASTERS.includes(cls) && cls !== "Warlock") {
    const slots = FULL_CASTER_SLOTS[level] ?? FULL_CASTER_SLOTS[1];
    for (let i = 0; i < slots.length; i++) {
      resources.push({
        key: `spell_slot_${i + 1}`,
        label: `Spell Slots Lv ${i + 1}`,
        current: slots[i],
        max: slots[i],
        rechargesOn: "long",
      });
    }
  }

  // ── Half Casters: Spell Slots (recharge on long rest, start at level 2) ──
  if (HALF_CASTERS.includes(cls) && level >= 2) {
    const slots = HALF_CASTER_SLOTS[level] ?? HALF_CASTER_SLOTS[2];
    for (let i = 0; i < slots.length; i++) {
      resources.push({
        key: `spell_slot_${i + 1}`,
        label: `Spell Slots Lv ${i + 1}`,
        current: slots[i],
        max: slots[i],
        rechargesOn: "long",
      });
    }
  }

  return resources;
}

/**
 * Recalculate resource maximums after level-up or ability score changes.
 * Preserves current values (capped at new max).
 */
export function recalculateResources(
  existing: ResourcePool,
  cls: CharacterClass,
  race: string,
  level: number,
  chaMod?: number,
): ResourcePool {
  const fresh = buildResourcePool(cls, race, level);

  // Update Bard inspiration uses based on CHA modifier
  if (cls === "Bard" && chaMod !== undefined) {
    const bardRes = fresh.find((r) => r.key === "bardic_inspiration");
    if (bardRes) {
      const uses = Math.max(1, chaMod);
      bardRes.max = uses;
      bardRes.current = uses;
    }
  }

  // Merge: keep current values from existing, capped at new max
  return fresh.map((newRes) => {
    const old = existing.find((r) => r.key === newRes.key);
    if (old) {
      return { ...newRes, current: Math.min(old.current, newRes.max) };
    }
    return newRes;
  });
}

/**
 * Recharge resources after a rest.
 */
export function rechargeResources(pool: ResourcePool, restType: RestType): ResourcePool {
  return pool.map((r) => {
    // Long rest recharges everything; short rest only recharges short-rest resources
    if (restType === "long" || r.rechargesOn === "short") {
      return { ...r, current: r.max };
    }
    return r;
  });
}

/**
 * Consume one use of a resource. Returns updated pool and whether it succeeded.
 */
export function consumeResource(
  pool: ResourcePool,
  key: string,
  amount: number = 1,
): { pool: ResourcePool; success: boolean } {
  const idx = pool.findIndex((r) => r.key === key);
  if (idx === -1) return { pool, success: false };

  const resource = pool[idx];
  if (resource.current < amount) return { pool, success: false };

  const updated = [...pool];
  updated[idx] = { ...resource, current: resource.current - amount };
  return { pool: updated, success: true };
}

/**
 * Find a resource by key.
 */
export function getResource(pool: ResourcePool, key: string): Resource | undefined {
  return pool.find((r) => r.key === key);
}

/**
 * Get the spell slot resource key to consume for a given spell level.
 * Returns the lowest available slot level >= spellLevel, or undefined if none available.
 */
export function findSpellSlot(pool: ResourcePool, spellLevel: number = 1): string | undefined {
  // Try exact level first, then upcast
  for (let lvl = spellLevel; lvl <= 9; lvl++) {
    const key = `spell_slot_${lvl}`;
    const slot = pool.find((r) => r.key === key && r.current > 0);
    if (slot) return key;
  }
  // Check pact slots for warlocks
  const pact = pool.find((r) => r.key === "pact_slots" && r.current > 0);
  if (pact) return "pact_slots";
  return undefined;
}
