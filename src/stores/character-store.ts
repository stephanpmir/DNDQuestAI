import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Character, Gender, Race, CharacterClass, AbilityScores, AvatarCustomization, BeginnerSurvey } from "@/types/character";
import { createDefaultCharacter, getXpToNextLevel } from "@/types/character";
import { getItemInfo, getEquipSlot, SLOT_LIMITS } from "@/lib/items";
import { RACIAL_DATA, applyRacialBonuses } from "@/lib/races";
import { buildResourcePool, recalculateResources, rechargeResources } from "@/lib/resources";
import type { ResourcePool } from "@/lib/resources";

interface CharacterStore {
  character: Character;
  isCreated: boolean;
  setName: (name: string) => void;
  setGender: (gender: Gender) => void;
  setRace: (race: Race) => void;
  setClass: (cls: CharacterClass) => void;
  setAbilityScores: (scores: AbilityScores) => void;
  setCampaignTheme: (theme: string) => void;
  setSkillProficiencies: (skills: string[]) => void;
  setCantrips: (cantrips: string[]) => void;
  setSpells: (spells: string[]) => void;
  setFightingStyle: (style: string) => void;
  setHalfElfBonuses: (bonuses: [string, string]) => void;
  setAvatar: (avatar: Partial<AvatarCustomization>) => void;
  setAvatarUrl: (url: string) => void;
  setAppearanceDescription: (desc: string) => void;
  setBeginnerSurvey: (survey: BeginnerSurvey) => void;
  finalizeCharacter: () => void;
  equipItem: (item: string) => void;
  unequipItem: (item: string) => void;
  identifyItem: (item: string) => void;
  updateFromGameState: (updates: {
    hpChange?: number;
    newItems?: string[];
    removeItems?: string[];
    goldChange?: number;
    xpGained?: number;
    lastRestTurn?: number;
    restType?: import("@/lib/resources").RestType;
    deathSaveResult?: "nat20" | "nat1" | "success" | "failure";
    karmaChange?: number;
    fameChange?: number;
    raging?: boolean;
    lastHealTurn?: number;
    lastTravelEncounterTurn?: number;
    resourceUpdates?: ResourcePool;
  }) => void;
  reset: () => void;
}

function computeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};

/** D&D 5e starting equipment by class — split into worn (equipped) and backpack (inventory) */
function getStartingEquipment(cls: CharacterClass): { worn: string[]; backpack: string[] } {
  const baseBackpack = ["Backpack", "Waterskin", "Rations x4", "Torch x4"];
  const classGear: Record<string, { worn: string[]; backpack: string[] }> = {
    Barbarian: {
      worn: ["Greataxe"],
      backpack: ["Handaxe", "Explorer's Pack"],
    },
    Bard: {
      worn: ["Rapier", "Leather Armor"],
      backpack: ["Lute", "Diplomat's Pack"],
    },
    Cleric: {
      worn: ["Mace", "Scale Mail", "Shield"],
      backpack: ["Holy Symbol", "Priest's Pack"],
    },
    Druid: {
      worn: ["Scimitar", "Leather Armor", "Wooden Shield"],
      backpack: ["Druidic Focus", "Explorer's Pack"],
    },
    Fighter: {
      worn: ["Longsword", "Chain Mail", "Shield"],
      backpack: ["Dungeoneer's Pack"],
    },
    Monk: {
      worn: ["Shortsword"],
      backpack: ["Dart x10", "Dungeoneer's Pack"],
    },
    Paladin: {
      worn: ["Longsword", "Chain Mail", "Shield"],
      backpack: ["Holy Symbol", "Priest's Pack"],
    },
    Ranger: {
      worn: ["Shortbow", "Leather Armor"],
      backpack: ["Shortsword", "Quiver with 20 Arrows", "Explorer's Pack"],
    },
    Rogue: {
      worn: ["Shortsword", "Leather Armor"],
      backpack: ["Shortbow", "Quiver with 20 Arrows", "Thieves' Tools", "Burglar's Pack"],
    },
    Sorcerer: {
      worn: ["Dagger"],
      backpack: ["Arcane Focus", "Dungeoneer's Pack"],
    },
    Warlock: {
      worn: ["Dagger", "Leather Armor"],
      backpack: ["Arcane Focus", "Scholar's Pack"],
    },
    Wizard: {
      worn: ["Quarterstaff"],
      backpack: ["Arcane Focus", "Spellbook", "Scholar's Pack"],
    },
  };
  const gear = classGear[cls] ?? classGear.Fighter;
  return {
    worn: gear.worn,
    backpack: [...baseBackpack, ...gear.backpack],
  };
}

/** Calculate AC based on equipped armor and class features */
function computeAC(cls: CharacterClass, dexScore: number, conScore: number, wisScore: number, equipped: string[], fightingStyle?: string): number {
  const dexMod = computeModifier(dexScore);
  const conMod = computeModifier(conScore);
  const wisMod = computeModifier(wisScore);

  // Check what armor is equipped
  const equippedLower = equipped.map(i => i.toLowerCase());
  const hasShield = equippedLower.some(i => i.includes("shield"));
  const shieldBonus = hasShield ? 2 : 0;

  // Find equipped armor
  const armorNames: Record<string, { base: number; type: "light" | "medium" | "heavy" }> = {
    "padded armor": { base: 11, type: "light" },
    "leather armor": { base: 11, type: "light" },
    "+1 leather armor": { base: 12, type: "light" },
    "studded leather": { base: 12, type: "light" },
    "hide armor": { base: 12, type: "medium" },
    "chain shirt": { base: 13, type: "medium" },
    "scale mail": { base: 14, type: "medium" },
    "breastplate": { base: 14, type: "medium" },
    "half plate": { base: 15, type: "medium" },
    "ring mail": { base: 14, type: "heavy" },
    "chain mail": { base: 16, type: "heavy" },
    "splint armor": { base: 17, type: "heavy" },
    "plate armor": { base: 18, type: "heavy" },
  };

  let armorAC: number | null = null;
  for (const item of equippedLower) {
    for (const [name, data] of Object.entries(armorNames)) {
      if (item.includes(name)) {
        if (data.type === "light") {
          armorAC = data.base + dexMod;
        } else if (data.type === "medium") {
          armorAC = data.base + Math.min(dexMod, 2);
        } else {
          armorAC = data.base;
        }
        break;
      }
    }
    if (armorAC !== null) break;
  }

  // Defense fighting style: +1 AC while wearing armor
  const defenseBonus = (armorAC !== null && fightingStyle?.includes("Defense")) ? 1 : 0;

  if (armorAC !== null) {
    return armorAC + shieldBonus + defenseBonus;
  }

  // No armor — use unarmored defense
  let baseAC = 10 + dexMod;
  if (cls === "Barbarian") baseAC = 10 + dexMod + conMod;
  if (cls === "Monk") baseAC = 10 + dexMod + wisMod;
  // Sorcerer Draconic Resilience: AC = 13 + DEX mod when not wearing armor
  if (cls === "Sorcerer") baseAC = 13 + dexMod;

  return baseAC + shieldBonus;
}


function computeStartingHp(cls: CharacterClass, conScore: number): number {
  const base = HIT_DICE[cls] ?? 8;
  // Sorcerer Draconic Resilience: +1 HP per level (including level 1)
  const draconicBonus = cls === "Sorcerer" ? 1 : 0;
  return base + computeModifier(conScore) + draconicBonus;
}

function computeMaxHpForLevel(cls: CharacterClass, conScore: number, level: number): number {
  const hitDie = HIT_DICE[cls] ?? 8;
  const conMod = computeModifier(conScore);
  // Level 1: full hit die + CON mod. Levels 2+: avg roll + CON mod per level.
  const avgRoll = Math.floor(hitDie / 2) + 1;
  // Sorcerer Draconic Resilience: +1 HP per level
  const draconicBonus = cls === "Sorcerer" ? level : 0;
  return hitDie + conMod + (level - 1) * (avgRoll + conMod) + draconicBonus;
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set) => ({
      character: createDefaultCharacter(),
      isCreated: false,

      setName: (name) =>
        set((s) => ({ character: { ...s.character, name } })),

      setGender: (gender) =>
        set((s) => ({ character: { ...s.character, gender } })),

      setRace: (race) =>
        set((s) => ({ character: { ...s.character, race } })),

      setClass: (cls) =>
        set((s) => ({ character: { ...s.character, class: cls } })),

      setAbilityScores: (scores) =>
        set((s) => ({ character: { ...s.character, abilityScores: scores } })),

      setCampaignTheme: (theme) =>
        set((s) => ({ character: { ...s.character, campaignTheme: theme } })),

      setSkillProficiencies: (skills) =>
        set((s) => ({ character: { ...s.character, skillProficiencies: skills } })),

      setCantrips: (cantrips) =>
        set((s) => ({ character: { ...s.character, cantrips } })),

      setSpells: (spells) =>
        set((s) => ({ character: { ...s.character, spells } })),

      setFightingStyle: (style) =>
        set((s) => ({ character: { ...s.character, fightingStyle: style } })),

      setHalfElfBonuses: (bonuses) =>
        set((s) => ({ character: { ...s.character, halfElfBonuses: bonuses } })),

      setAvatar: (avatar) =>
        set((s) => ({
          character: {
            ...s.character,
            avatar: { ...s.character.avatar, ...avatar },
          },
        })),

      setAvatarUrl: (url) =>
        set((s) => ({ character: { ...s.character, avatarUrl: url } })),

      setAppearanceDescription: (desc) =>
        set((s) => ({ character: { ...s.character, appearanceDescription: desc } })),

      setBeginnerSurvey: (survey) =>
        set((s) => ({ character: { ...s.character, beginnerSurvey: survey } })),

      finalizeCharacter: () =>
        set((s) => {
          const c = s.character;

          // Apply racial ability score bonuses
          const baseScores: Record<string, number> = {
            strength: c.abilityScores.strength,
            dexterity: c.abilityScores.dexterity,
            constitution: c.abilityScores.constitution,
            intelligence: c.abilityScores.intelligence,
            wisdom: c.abilityScores.wisdom,
            charisma: c.abilityScores.charisma,
          };
          const finalScores = applyRacialBonuses(baseScores, c.race, c.halfElfBonuses);
          const abilityScores: AbilityScores = {
            strength: finalScores.strength,
            dexterity: finalScores.dexterity,
            constitution: finalScores.constitution,
            intelligence: finalScores.intelligence,
            wisdom: finalScores.wisdom,
            charisma: finalScores.charisma,
          };

          const racialTraits = RACIAL_DATA[c.race]?.traits ?? [];

          // Add racial cantrips
          const cantrips = [...c.cantrips];
          // Tiefling Infernal Legacy: Thaumaturgy cantrip
          if (c.race === "Tiefling" && !cantrips.includes("Thaumaturgy")) {
            cantrips.push("Thaumaturgy");
          }

          // Add racial skill proficiencies
          const skillProfs = [...c.skillProficiencies];
          // Elf: Perception proficiency
          if (c.race === "Elf" && !skillProfs.includes("Perception")) {
            skillProfs.push("Perception");
          }
          // Half-Orc: Intimidation proficiency
          if (c.race === "Half-Orc" && !skillProfs.includes("Intimidation")) {
            skillProfs.push("Intimidation");
          }

          const hp = computeStartingHp(c.class, abilityScores.constitution);
          const gear = getStartingEquipment(c.class);
          const equipped = [...gear.worn];
          const inventory = [...gear.worn, ...gear.backpack];
          // Use full computeAC with equipped items so shield bonus is included
          const ac = computeAC(c.class, abilityScores.dexterity, abilityScores.constitution, abilityScores.wisdom, equipped, c.fightingStyle);
          const identifiedItems = inventory.filter((item) => {
            const info = getItemInfo(item);
            return info?.isMagical;
          });

          // Build initial resource pool
          const chaMod = computeModifier(abilityScores.charisma);
          const resources = buildResourcePool(c.class, c.race, 1);
          // Adjust Bard inspiration uses based on CHA
          if (c.class === "Bard") {
            const bardRes = resources.find((r) => r.key === "bardic_inspiration");
            if (bardRes) {
              const uses = Math.max(1, chaMod);
              bardRes.max = uses;
              bardRes.current = uses;
            }
          }

          return {
            isCreated: true,
            character: {
              ...c,
              abilityScores,
              racialTraits,
              cantrips,
              skillProficiencies: skillProfs,
              hp,
              maxHp: hp,
              ac,
              inventory,
              equipped,
              identifiedItems,
              xp: 0,
              xpToNextLevel: getXpToNextLevel(1),
              lastRestTurn: -1,
              deathSaves: { successes: 0, failures: 0 },
              isUnconscious: false,
              isDead: false,
              resources,
            },
          };
        }),

      equipItem: (item) =>
        set((s) => {
          if (s.character.equipped.includes(item)) {
            return s; // Already equipped
          }
          // Enforce slot limits: unequip existing item in same slot if at limit
          const slot = getEquipSlot(item);
          let filtered = [...s.character.equipped];
          if (slot !== "none") {
            const limit = SLOT_LIMITS[slot] ?? 1;
            const inSlot = filtered.filter((e) => getEquipSlot(e) === slot);
            if (inSlot.length >= limit) {
              // Remove oldest item in this slot to make room
              const toRemove = inSlot[0];
              filtered = filtered.filter((e) => e !== toRemove);
            }
          }
          const newEquipped = [...filtered, item];
          const ac = computeAC(
            s.character.class, s.character.abilityScores.dexterity,
            s.character.abilityScores.constitution, s.character.abilityScores.wisdom,
            newEquipped, s.character.fightingStyle
          );
          return { character: { ...s.character, equipped: newEquipped, ac } };
        }),

      unequipItem: (item) =>
        set((s) => {
          const newEquipped = s.character.equipped.filter((i) => i !== item);
          const ac = computeAC(
            s.character.class, s.character.abilityScores.dexterity,
            s.character.abilityScores.constitution, s.character.abilityScores.wisdom,
            newEquipped, s.character.fightingStyle
          );
          return { character: { ...s.character, equipped: newEquipped, ac } };
        }),

      identifyItem: (item) =>
        set((s) => ({
          character: {
            ...s.character,
            identifiedItems: s.character.identifiedItems.includes(item)
              ? s.character.identifiedItems
              : [...s.character.identifiedItems, item],
          },
        })),

      updateFromGameState: (updates) =>
        set((s) => {
          const c = { ...s.character };

          // HP changes
          if (updates.hpChange) {
            c.hp = Math.max(0, Math.min(c.maxHp, c.hp + updates.hpChange));

            // D&D death rules: 0 HP = unconscious
            if (c.hp <= 0) {
              // Half-Orc Relentless Endurance: drop to 1 HP instead of 0, once per long rest
              if (c.race === "Half-Orc" && !c.isUnconscious && !c.relentlessUsed) {
                c.hp = 1;
                c.relentlessUsed = true;
              } else {
                c.hp = 0;
                c.isUnconscious = true;
              }
            }

            // Healing from unconscious
            if (c.isUnconscious && updates.hpChange > 0 && c.hp > 0) {
              c.isUnconscious = false;
              c.deathSaves = { successes: 0, failures: 0 };
            }
          }

          // Items
          if (updates.newItems) {
            c.inventory = [...c.inventory, ...updates.newItems];
          }
          if (updates.removeItems) {
            c.inventory = c.inventory.filter(
              (item) => !updates.removeItems!.includes(item)
            );
            // Also remove from equipped and recalculate AC
            const oldEquipped = c.equipped;
            c.equipped = c.equipped.filter(
              (item) => !updates.removeItems!.includes(item)
            );
            if (c.equipped.length !== oldEquipped.length) {
              c.ac = computeAC(c.class, c.abilityScores.dexterity, c.abilityScores.constitution, c.abilityScores.wisdom, c.equipped, c.fightingStyle);
            }
          }

          // Gold
          if (updates.goldChange) {
            c.gold = Math.max(0, c.gold + updates.goldChange);
          }

          // Barbarian rage state
          if (updates.raging !== undefined) {
            c.raging = updates.raging;
          }

          // Healing spell cooldown tracking
          if (updates.lastHealTurn !== undefined) {
            c.lastHealTurn = updates.lastHealTurn;
          }

          // Travel encounter cooldown tracking
          if (updates.lastTravelEncounterTurn !== undefined) {
            c.lastTravelEncounterTurn = updates.lastTravelEncounterTurn;
          }

          // Resource pool updates (from engine resource consumption)
          if (updates.resourceUpdates) {
            c.resources = updates.resourceUpdates;
          }

          // Rest tracking
          if (updates.lastRestTurn !== undefined) {
            c.lastRestTurn = updates.lastRestTurn;
            const restType = updates.restType ?? "short";
            // Reset Half-Orc Relentless Endurance on long rest
            if (c.race === "Half-Orc" && restType === "long") {
              c.relentlessUsed = false;
            }
            // End Barbarian Rage on rest
            if (c.class === "Barbarian") {
              c.raging = false;
            }
            // Recharge resources based on rest type
            if (c.resources) {
              c.resources = rechargeResources(c.resources, restType);
            }
          }

          // Death save tracking
          if (updates.deathSaveResult) {
            if (updates.deathSaveResult === "nat20") {
              c.deathSaves = { successes: 0, failures: 0 };
              // HP is already handled above via hpChange
            } else if (updates.deathSaveResult === "nat1") {
              c.deathSaves = { ...c.deathSaves, failures: Math.min(3, c.deathSaves.failures + 2) };
            } else if (updates.deathSaveResult === "success") {
              c.deathSaves = { ...c.deathSaves, successes: Math.min(3, c.deathSaves.successes + 1) };
              // 3 successes = stabilize at 0 HP (still unconscious but no longer dying)
            } else if (updates.deathSaveResult === "failure") {
              c.deathSaves = { ...c.deathSaves, failures: Math.min(3, c.deathSaves.failures + 1) };
            }

            // 3 failures = character is dead
            if (c.deathSaves.failures >= 3) {
              c.isDead = true;
            }

            // 3 successes = stabilized, regain 1 HP and wake up
            if (c.deathSaves.successes >= 3) {
              c.deathSaves = { successes: 0, failures: 0 };
              c.hp = 1;
              c.isUnconscious = false;
            }
          }

          // XP and level-up
          if (updates.xpGained && updates.xpGained > 0) {
            c.xp += updates.xpGained;

            // Check for level up (D&D 5e thresholds)
            while (c.level < 20 && c.xp >= c.xpToNextLevel) {
              c.level += 1;
              c.xpToNextLevel = getXpToNextLevel(c.level);

              // Increase maxHP on level up
              const newMaxHp = computeMaxHpForLevel(
                c.class,
                c.abilityScores.constitution,
                c.level
              );
              const hpIncrease = newMaxHp - c.maxHp;
              c.maxHp = newMaxHp;
              c.hp = Math.min(c.maxHp, c.hp + hpIncrease);

              // Recalculate resource pools on level-up
              if (c.resources) {
                const chaMod = computeModifier(c.abilityScores.charisma);
                c.resources = recalculateResources(c.resources, c.class, c.race, c.level, chaMod);
              }
            }
          }

          // Karma
          if (updates.karmaChange) {
            c.karma = Math.max(-100, Math.min(100, c.karma + updates.karmaChange));
          }

          // Fame
          if (updates.fameChange) {
            c.fame = Math.max(0, Math.min(100, c.fame + updates.fameChange));
          }

          return { character: c };
        }),

      reset: () =>
        set({ character: createDefaultCharacter(), isCreated: false }),
    }),
    { name: "dndquest-character" }
  )
);
