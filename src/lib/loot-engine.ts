/**
 * Loot Engine — generates loot drops when enemies are defeated.
 *
 * Loot is determined by the defeated monster's CR using tiered tables.
 * Gold is rolled using dice pools and items are selected by rarity tier.
 * The engine returns both structured data (for gameState) and flavor
 * narrative text (for the DM to include in the response).
 */

import { roll } from "@/lib/engine/dice";
import type { Monster } from "@/lib/monsters";

// ── Item tables by rarity ────────────────────────────────────────

const COMMON_ITEMS = [
  "Healing Potion",
  "Thieves' Tools",
  "Torch",
  "Rations (3 days)",
  "Rope (50 ft.)",
];

const UNCOMMON_ITEMS = [
  "Potion of Invisibility",
  "Antitoxin",
  "Arrows x20",
  "Set of Lockpicks",
];

const RARE_ITEMS = [
  "Ring of Protection",
  "Cloak of Elvenkind",
  "Potion of Greater Healing",
];

// ── Loot result interface ────────────────────────────────────────

export interface LootDrop {
  /** Gold pieces awarded */
  gold: number;
  /** Items dropped */
  items: string[];
  /** Flavor narrative describing the loot */
  narrative: string;
}

// ── Flavor text pools ────────────────────────────────────────────

const GOLD_FLAVOR = [
  "A coin pouch clinks at the creature's belt",
  "Scattered coins glint among the remains",
  "You rifle through the pockets and find coin",
  "A small cache of gold spills from a torn satchel",
];

const ITEM_FLAVOR: Record<string, string[]> = {
  common: [
    "Something useful catches your eye among the debris",
    "A battered but serviceable item lies nearby",
    "You spot something worth taking",
  ],
  uncommon: [
    "A faint gleam reveals something of value",
    "Among the spoils, something catches the light",
    "A well-crafted item stands out from the rest",
  ],
  rare: [
    "A faint magical aura radiates from an item on the body",
    "Something extraordinary gleams with inner power",
    "Your fingers close around an item that hums with enchantment",
  ],
};

function pickFlavor(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Core loot generation ─────────────────────────────────────────

/**
 * Generate a loot drop based on a defeated monster's CR.
 *
 * Tiers:
 *   CR 0–0.5:  1d6 gold,  20% common item
 *   CR 1–2:    2d6 gold,  40% common OR 10% uncommon item
 *   CR 3–4:    4d6 gold,  60% uncommon item
 *   CR 5+:     10d6 gold, 80% rare item
 */
export function generateLoot(monster: Monster): LootDrop {
  const cr = monster.cr;
  let gold: number;
  const items: string[] = [];
  let itemRarity: "common" | "uncommon" | "rare" | null = null;

  if (cr <= 0.5) {
    // Tier 1: CR 0–0.5
    gold = roll(1, 6).reduce((a, b) => a + b, 0);
    if (Math.random() < 0.2) {
      items.push(pickFrom(COMMON_ITEMS));
      itemRarity = "common";
    }
  } else if (cr <= 2) {
    // Tier 2: CR 1–2
    gold = roll(2, 6).reduce((a, b) => a + b, 0);
    const itemRoll = Math.random();
    if (itemRoll < 0.10) {
      items.push(pickFrom(UNCOMMON_ITEMS));
      itemRarity = "uncommon";
    } else if (itemRoll < 0.50) {
      // 40% common (0.10 to 0.50)
      items.push(pickFrom(COMMON_ITEMS));
      itemRarity = "common";
    }
  } else if (cr <= 4) {
    // Tier 3: CR 3–4
    gold = roll(4, 6).reduce((a, b) => a + b, 0);
    if (Math.random() < 0.6) {
      items.push(pickFrom(UNCOMMON_ITEMS));
      itemRarity = "uncommon";
    }
  } else {
    // Tier 4: CR 5+
    gold = roll(10, 6).reduce((a, b) => a + b, 0);
    if (Math.random() < 0.8) {
      items.push(pickFrom(RARE_ITEMS));
      itemRarity = "rare";
    }
  }

  // Build flavor narrative
  const narrative = buildLootNarrative(monster.name, gold, items, itemRarity);

  return { gold, items, narrative };
}

function pickFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Narrative builder ────────────────────────────────────────────

function buildLootNarrative(
  monsterName: string,
  gold: number,
  items: string[],
  rarity: "common" | "uncommon" | "rare" | null,
): string {
  const parts: string[] = [];

  if (gold > 0) {
    parts.push(`${pickFlavor(GOLD_FLAVOR)} — ${gold} gold pieces.`);
  }

  if (items.length > 0 && rarity) {
    parts.push(`${pickFlavor(ITEM_FLAVOR[rarity])}: ${items.join(", ")}.`);
  }

  if (parts.length === 0) {
    return `The ${monsterName} carried nothing of value.`;
  }

  return parts.join(" ");
}

/**
 * Generate loot for a monster given only its CR (when no full Monster object is available).
 * Uses a placeholder name for the narrative.
 */
export function generateLootByCR(cr: number, enemyName: string = "enemy"): LootDrop {
  const fakeMonster: Monster = {
    name: enemyName,
    cr,
    ac: 10,
    hp: 1,
    speed: "30 ft.",
    size: "Medium",
    type: "humanoid",
    alignment: "neutral",
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    damageImmunities: [],
    damageResistances: [],
    conditionImmunities: [],
    senses: "passive Perception 10",
    languages: "—",
    xpReward: 0,
    attacks: [],
  };
  return generateLoot(fakeMonster);
}
