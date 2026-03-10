/**
 * Item database — descriptions, properties, equip slots, and icons for D&D 5e items.
 */

/** Equipment slot types */
export type EquipSlot = "weapon" | "offhand" | "armor" | "boots" | "gloves" | "necklace" | "ring" | "none";

export interface ItemInfo {
  name: string;
  description: string;
  isMagical: boolean;
  magicalProperties?: string;
  category: "weapon" | "armor" | "shield" | "boots" | "gloves" | "necklace" | "ring" | "gear" | "consumable" | "tool" | "focus";
  /** Which slot this item occupies */
  slot: EquipSlot;
  /** Whether two-handed (blocks offhand/shield) */
  twoHanded?: boolean;
  /** Icon character for display */
  icon: string;
}

/** Slot limits: how many items can occupy each slot */
export const SLOT_LIMITS: Record<EquipSlot, number> = {
  weapon: 1,
  offhand: 1,
  armor: 1,
  boots: 1,
  gloves: 1,
  necklace: 1,
  ring: 2,
  none: 0,
};

const ITEM_DB: ItemInfo[] = [
  // ── Swords ──
  { name: "longsword", description: "A versatile sword with a long blade, effective in one or two hands.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u2694\uFE0F" },
  { name: "shortsword", description: "A light, nimble blade ideal for quick strikes. Uses finesse.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F5E1}\uFE0F" },
  { name: "greatsword", description: "A massive two-handed sword that deals heavy slashing damage.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u2694\uFE0F" },
  { name: "rapier", description: "An elegant, thin blade favored by duelists. Uses finesse.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F5E1}\uFE0F" },
  { name: "scimitar", description: "A curved blade designed for swift, sweeping cuts. Uses finesse.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F5E1}\uFE0F" },

  // ── Axes ──
  { name: "greataxe", description: "A heavy two-handed axe favored by barbarians.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1FA93}" },
  { name: "handaxe", description: "A light, throwable axe suitable for melee or ranged attacks.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1FA93}" },
  { name: "battleaxe", description: "A versatile axe that can be wielded with one or two hands.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1FA93}" },

  // ── Blunt ──
  { name: "mace", description: "A heavy bludgeoning weapon with a flanged metal head.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F528}" },
  { name: "warhammer", description: "A heavy hammer built for crushing armor and bone.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F528}" },
  { name: "flail", description: "A spiked ball on a chain, difficult to block with a shield.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F528}" },
  { name: "morningstar", description: "A spiked mace that deals piercing damage on impact.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F528}" },
  { name: "maul", description: "An enormous two-handed hammer that delivers crushing blows.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F528}" },

  // ── Polearms ──
  { name: "spear", description: "A simple polearm that can be thrown or used in melee.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F531}" },
  { name: "javelin", description: "A light throwing spear designed for ranged attacks.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F531}" },
  { name: "trident", description: "A three-pronged spear, versatile and throwable.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F531}" },
  { name: "halberd", description: "A polearm with an axe blade, spike, and hook. Has reach.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F531}" },
  { name: "pike", description: "A long spear designed for holding formations. Has reach.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F531}" },
  { name: "glaive", description: "A curved blade on a long pole. Has reach.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F531}" },
  { name: "lance", description: "A jousting weapon that deals heavy damage on a charge.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F531}" },

  // ── Small / misc weapons ──
  { name: "dagger", description: "A small, concealable blade. Light and throwable, uses finesse.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1F5E1}\uFE0F" },
  { name: "quarterstaff", description: "A simple wooden staff, versatile in combat.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1FA84}" },
  { name: "whip", description: "A flexible weapon with reach and finesse.", isMagical: false, category: "weapon", slot: "weapon", icon: "\u{1FA83}" },

  // ── Ranged ──
  { name: "longbow", description: "A tall bow requiring strength and skill. Effective at long range.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F3F9}" },
  { name: "shortbow", description: "A compact bow ideal for skirmishing and mounted combat.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F3F9}" },
  { name: "crossbow", description: "A mechanical ranged weapon. Simple to use but slow to reload.", isMagical: false, category: "weapon", slot: "weapon", twoHanded: true, icon: "\u{1F3F9}" },

  // ── Armor — Light ──
  { name: "leather armor", description: "Light armor made of cured leather. AC 11 + DEX modifier.", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F9E5}" },
  { name: "studded leather", description: "Reinforced leather armor with metal rivets. AC 12 + DEX.", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F9E5}" },
  { name: "padded armor", description: "Light armor of quilted layers of cloth. AC 11 + DEX.", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F9E5}" },

  // ── Armor — Medium ──
  { name: "scale mail", description: "Medium armor of overlapping metal scales. AC 14 + DEX (max 2).", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F6E1}\uFE0F" },
  { name: "half plate", description: "Medium armor with metal plates. AC 15 + DEX (max 2).", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F6E1}\uFE0F" },
  { name: "breastplate", description: "Medium armor protecting the torso. AC 14 + DEX (max 2).", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F6E1}\uFE0F" },
  { name: "hide armor", description: "Medium armor made from thick animal hides. AC 12 + DEX (max 2).", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F9E5}" },
  { name: "chain shirt", description: "Medium armor of interlocking rings. AC 13 + DEX (max 2).", isMagical: false, category: "armor", slot: "armor", icon: "\u26D3\uFE0F" },

  // ── Armor — Heavy ──
  { name: "chain mail", description: "Heavy armor of interlocking metal rings. AC 16, STR 13 required.", isMagical: false, category: "armor", slot: "armor", icon: "\u26D3\uFE0F" },
  { name: "plate armor", description: "The finest heavy armor, full metal plates. AC 18, STR 15 required.", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F6E1}\uFE0F" },
  { name: "ring mail", description: "Heavy armor of leather with metal rings. AC 14.", isMagical: false, category: "armor", slot: "armor", icon: "\u26D3\uFE0F" },
  { name: "splint armor", description: "Heavy armor of metal strips. AC 17, STR 15 required.", isMagical: false, category: "armor", slot: "armor", icon: "\u{1F6E1}\uFE0F" },

  // ── Shields ──
  { name: "shield", description: "A wooden or metal shield. +2 AC when wielded.", isMagical: false, category: "shield", slot: "offhand", icon: "\u{1F6E1}\uFE0F" },
  { name: "wooden shield", description: "A simple wooden shield. +2 AC when wielded.", isMagical: false, category: "shield", slot: "offhand", icon: "\u{1F6E1}\uFE0F" },

  // ── Boots ──
  { name: "boots of elvenkind", description: "Soft, elegant boots of elven make.", isMagical: true, magicalProperties: "Advantage on Stealth checks.", category: "boots", slot: "boots", icon: "\u{1F97E}" },
  { name: "boots of speed", description: "Sleek boots that shimmer with arcane energy.", isMagical: true, magicalProperties: "Double walking speed for 10 minutes (bonus action to activate).", category: "boots", slot: "boots", icon: "\u{1F97E}" },
  { name: "boots of striding", description: "Sturdy boots reinforced with enchantments.", isMagical: true, magicalProperties: "Walking speed becomes 30 ft regardless of encumbrance.", category: "boots", slot: "boots", icon: "\u{1F97E}" },

  // ── Gloves ──
  { name: "gauntlets of ogre power", description: "Heavy iron gauntlets etched with runes.", isMagical: true, magicalProperties: "Strength score becomes 19.", category: "gloves", slot: "gloves", icon: "\u{1F9E4}" },
  { name: "gloves of thievery", description: "Thin, supple gloves that enhance dexterity.", isMagical: true, magicalProperties: "+5 to Sleight of Hand and lockpicking.", category: "gloves", slot: "gloves", icon: "\u{1F9E4}" },
  { name: "gloves of missile snaring", description: "Finely crafted gloves with silvered fingertips.", isMagical: true, magicalProperties: "Reduce ranged attack damage by 1d10 + DEX.", category: "gloves", slot: "gloves", icon: "\u{1F9E4}" },

  // ── Necklaces / Amulets ──
  { name: "amulet of health", description: "A golden amulet with a ruby centerpiece.", isMagical: true, magicalProperties: "Constitution score becomes 19.", category: "necklace", slot: "necklace", icon: "\u{1F4FF}" },
  { name: "amulet of proof against detection", description: "A plain silver amulet that absorbs divination magic.", isMagical: true, magicalProperties: "Hidden from divination magic.", category: "necklace", slot: "necklace", icon: "\u{1F4FF}" },
  { name: "periapt of wound closure", description: "A spiral pendant that pulses with faint warmth.", isMagical: true, magicalProperties: "Stabilize at 0 HP automatically. Double hit dice healing.", category: "necklace", slot: "necklace", icon: "\u{1F4FF}" },
  { name: "necklace of fireballs", description: "A chain strung with small red beads that are warm to the touch.", isMagical: true, magicalProperties: "Detach and throw beads to cast Fireball.", category: "necklace", slot: "necklace", icon: "\u{1F4FF}" },

  // ── Rings ──
  { name: "ring of protection", description: "A simple silver band that glows faintly.", isMagical: true, magicalProperties: "+1 bonus to AC and saving throws.", category: "ring", slot: "ring", icon: "\u{1F48D}" },
  { name: "ring of resistance", description: "A gemmed ring that shields against elemental harm.", isMagical: true, magicalProperties: "Resistance to one damage type (determined by gem).", category: "ring", slot: "ring", icon: "\u{1F48D}" },
  { name: "ring of spell storing", description: "A crystalline ring that hums with stored magic.", isMagical: true, magicalProperties: "Store up to 5 levels of spells to cast later.", category: "ring", slot: "ring", icon: "\u{1F48D}" },

  // ── Cloaks ──
  { name: "cloak of protection", description: "A fine cloak that seems to deflect blows.", isMagical: true, magicalProperties: "+1 bonus to AC and saving throws.", category: "armor", slot: "armor", icon: "\u{1F9E5}" },

  // ── Gear (non-equippable) ──
  { name: "backpack", description: "A sturdy leather pack for carrying equipment.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },
  { name: "waterskin", description: "A leather container holding up to 4 pints of liquid.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F4A7}" },
  { name: "rations", description: "Dried food sufficient for one day of travel.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F35E}" },
  { name: "torch", description: "A wooden rod wrapped in oil-soaked cloth. Provides bright light in a 20-foot radius.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F525}" },
  { name: "rope", description: "50 feet of hempen or silk rope. Useful for climbing and binding.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F9F6}" },
  { name: "grappling hook", description: "An iron hook with prongs for scaling walls.", isMagical: false, category: "gear", slot: "none", icon: "\u{1FA9D}" },
  { name: "bedroll", description: "A padded sleeping mat that rolls up for easy transport.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F6CF}\uFE0F" },
  { name: "tinderbox", description: "Flint, steel, and tinder for starting fires.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F525}" },
  { name: "lantern", description: "A hooded lantern that casts bright light in a 30-foot radius.", isMagical: false, category: "gear", slot: "none", icon: "\u{1FA94}" },
  { name: "oil", description: "A flask of oil that can fuel a lantern or be used as a weapon.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F9F4}" },
  { name: "crowbar", description: "An iron bar for prying open doors and crates.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F527}" },
  { name: "piton", description: "An iron spike for securing rope to rock or walls.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F4CC}" },
  { name: "quiver", description: "A leather case holding up to 20 arrows or bolts.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F3F9}" },

  // ── Packs (bundles) ──
  { name: "explorer's pack", description: "Contains a backpack, bedroll, mess kit, tinderbox, torches, rations, and a waterskin.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },
  { name: "dungeoneer's pack", description: "Contains a backpack, crowbar, hammer, pitons, torches, tinderbox, rations, and rope.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },
  { name: "diplomat's pack", description: "Contains a chest, fine clothes, ink, paper, a lamp, perfume, and sealing wax.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },
  { name: "priest's pack", description: "Contains a backpack, blanket, candles, tinderbox, alms box, incense, and vestments.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },
  { name: "scholar's pack", description: "Contains a backpack, book of lore, ink, pens, parchment, and a small knife.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },
  { name: "burglar's pack", description: "Contains a backpack, ball bearings, string, bell, candles, crowbar, and a hooded lantern.", isMagical: false, category: "gear", slot: "none", icon: "\u{1F392}" },

  // ── Tools ──
  { name: "thieves' tools", description: "A set of lockpicks, small mirrors, and narrow-bladed scissors for disarming traps and opening locks.", isMagical: false, category: "tool", slot: "none", icon: "\u{1F527}" },

  // ── Focuses ──
  { name: "arcane focus", description: "A crystal, orb, or wand used to channel arcane spellcasting.", isMagical: false, category: "focus", slot: "weapon", icon: "\u{1FA84}" },
  { name: "holy symbol", description: "A sacred emblem of divine power, used as a spellcasting focus.", isMagical: false, category: "focus", slot: "necklace", icon: "\u271D\uFE0F" },
  { name: "druidic focus", description: "A totem, staff, or sprig of mistletoe used to channel nature magic.", isMagical: false, category: "focus", slot: "weapon", icon: "\u{1F33F}" },
  { name: "spellbook", description: "A leather-bound tome containing a wizard's recorded spells.", isMagical: false, category: "focus", slot: "none", icon: "\u{1F4D6}" },
  { name: "lute", description: "A stringed instrument used by bards as a spellcasting focus.", isMagical: false, category: "focus", slot: "weapon", icon: "\u{1F3B5}" },

  // ── Consumables ──
  { name: "healing potion", description: "A glowing red liquid that restores health when consumed.", isMagical: true, magicalProperties: "Restores 2d4+2 hit points.", category: "consumable", slot: "none", icon: "\u{1F9EA}" },
  { name: "greater healing potion", description: "A vibrant crimson potion that restores significant health.", isMagical: true, magicalProperties: "Restores 4d4+4 hit points.", category: "consumable", slot: "none", icon: "\u{1F9EA}" },
  { name: "superior healing potion", description: "A deep scarlet potion of extraordinary restorative power.", isMagical: true, magicalProperties: "Restores 8d4+8 hit points.", category: "consumable", slot: "none", icon: "\u{1F9EA}" },
  { name: "potion of fire resistance", description: "An orange, shimmering liquid.", isMagical: true, magicalProperties: "Grants resistance to fire damage for 1 hour.", category: "consumable", slot: "none", icon: "\u{1F9EA}" },
  { name: "antitoxin", description: "A vial of liquid that counteracts poison.", isMagical: false, category: "consumable", slot: "none", icon: "\u{1F9EA}" },

  // ── Magical weapons ──
  { name: "+1 longsword", description: "A finely crafted sword with a faint magical aura.", isMagical: true, magicalProperties: "+1 bonus to attack and damage rolls.", category: "weapon", slot: "weapon", icon: "\u2694\uFE0F" },
  { name: "+1 shield", description: "A shield reinforced with protective enchantments.", isMagical: true, magicalProperties: "+1 bonus to AC (total +3 with shield).", category: "shield", slot: "offhand", icon: "\u{1F6E1}\uFE0F" },
  { name: "+1 leather armor", description: "Supple leather armor imbued with protective magic.", isMagical: true, magicalProperties: "+1 bonus to AC.", category: "armor", slot: "armor", icon: "\u{1F9E5}" },

  // ── Magical misc ──
  { name: "bag of holding", description: "A cloth bag that opens into a nondimensional space.", isMagical: true, magicalProperties: "Interior is larger than outside; holds up to 500 pounds.", category: "gear", slot: "none", icon: "\u{1F45C}" },
];

/**
 * Look up item info by name (case-insensitive partial match).
 */
export function getItemInfo(itemName: string): ItemInfo | null {
  const lower = itemName.toLowerCase();
  const exact = ITEM_DB.find((i) => lower === i.name);
  if (exact) return exact;
  return ITEM_DB.find((i) => lower.includes(i.name) || i.name.includes(lower)) ?? null;
}

/**
 * Get the icon for an item, with fallback based on category guess.
 */
export function getItemIcon(itemName: string): string {
  const info = getItemInfo(itemName);
  if (info) return info.icon;

  // Fallback icon guesses based on name
  const lower = itemName.toLowerCase();
  if (lower.includes("sword") || lower.includes("blade")) return "\u2694\uFE0F";
  if (lower.includes("axe")) return "\u{1FA93}";
  if (lower.includes("bow") || lower.includes("arrow")) return "\u{1F3F9}";
  if (lower.includes("staff") || lower.includes("wand")) return "\u{1FA84}";
  if (lower.includes("hammer") || lower.includes("mace") || lower.includes("maul")) return "\u{1F528}";
  if (lower.includes("shield")) return "\u{1F6E1}\uFE0F";
  if (lower.includes("armor") || lower.includes("mail") || lower.includes("plate")) return "\u{1F6E1}\uFE0F";
  if (lower.includes("boot")) return "\u{1F97E}";
  if (lower.includes("glove") || lower.includes("gauntlet")) return "\u{1F9E4}";
  if (lower.includes("ring")) return "\u{1F48D}";
  if (lower.includes("amulet") || lower.includes("necklace") || lower.includes("pendant")) return "\u{1F4FF}";
  if (lower.includes("potion") || lower.includes("elixir")) return "\u{1F9EA}";
  if (lower.includes("scroll")) return "\u{1F4DC}";
  if (lower.includes("key")) return "\u{1F511}";
  if (lower.includes("gem") || lower.includes("jewel")) return "\u{1F48E}";
  if (lower.includes("gold") || lower.includes("coin")) return "\u{1FA99}";
  return "\u{1F4E6}"; // generic box
}

/**
 * Determine if an item is equippable (has a slot).
 */
export function isEquippable(itemName: string): boolean {
  const info = getItemInfo(itemName);
  if (!info) return false;
  return info.slot !== "none";
}

/**
 * Get the equip slot for an item.
 */
export function getEquipSlot(itemName: string): EquipSlot {
  const info = getItemInfo(itemName);
  return info?.slot ?? "none";
}

/**
 * Get default equipped items for starting equipment.
 * Weapons, armor, shields, and focuses are auto-equipped.
 */
export function getDefaultEquipped(inventory: string[]): string[] {
  return inventory.filter((item) => {
    const info = getItemInfo(item);
    if (!info) return false;
    return info.slot !== "none";
  });
}
