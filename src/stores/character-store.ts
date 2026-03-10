import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Character, Gender, Race, CharacterClass, AbilityScores, AvatarCustomization, BeginnerSurvey } from "@/types/character";
import { createDefaultCharacter, getXpToNextLevel } from "@/types/character";
import { getDefaultEquipped, getItemInfo } from "@/lib/items";
import { RACIAL_DATA, applyRacialBonuses } from "@/lib/races";

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
    deathSaveResult?: "nat20" | "nat1" | "success" | "failure";
    karmaChange?: number;
    fameChange?: number;
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

/** D&D 5e starting equipment by class */
function getStartingEquipment(cls: CharacterClass): string[] {
  const base = ["Backpack", "Waterskin", "Rations (3 days)", "Torch"];
  const classGear: Record<string, string[]> = {
    Barbarian: ["Greataxe", "Handaxe", "Explorer's Pack"],
    Bard: ["Rapier", "Lute", "Leather Armor", "Diplomat's Pack"],
    Cleric: ["Mace", "Shield", "Scale Mail", "Priest's Pack", "Holy Symbol"],
    Druid: ["Wooden Shield", "Scimitar", "Leather Armor", "Explorer's Pack", "Druidic Focus"],
    Fighter: ["Longsword", "Shield", "Chain Mail", "Dungeoneer's Pack"],
    Monk: ["Shortsword", "Dungeoneer's Pack"],
    Paladin: ["Longsword", "Shield", "Chain Mail", "Priest's Pack", "Holy Symbol"],
    Ranger: ["Longbow", "Quiver (20 Arrows)", "Shortsword", "Leather Armor", "Explorer's Pack"],
    Rogue: ["Shortsword", "Shortbow", "Quiver (20 Arrows)", "Leather Armor", "Burglar's Pack", "Thieves' Tools"],
    Sorcerer: ["Dagger", "Arcane Focus", "Dungeoneer's Pack"],
    Warlock: ["Dagger", "Arcane Focus", "Scholar's Pack", "Leather Armor"],
    Wizard: ["Quarterstaff", "Spellbook", "Arcane Focus", "Scholar's Pack"],
  };
  return [...base, ...(classGear[cls] ?? [])];
}

/** Calculate starting AC based on class armor */
function computeStartingAC(cls: CharacterClass, dexScore: number, conScore: number = 10): number {
  const dexMod = computeModifier(dexScore);
  const conMod = computeModifier(conScore);
  switch (cls) {
    case "Barbarian": return 10 + dexMod + conMod; // Unarmored defense
    case "Monk": return 10 + dexMod; // Unarmored defense (+ WIS later)
    case "Sorcerer":
    case "Wizard": return 10 + dexMod;
    case "Bard":
    case "Ranger":
    case "Rogue":
    case "Warlock": return 11 + dexMod; // Leather
    case "Druid": return 11 + dexMod; // Leather (druids won't wear metal)
    case "Cleric": return 14 + Math.min(dexMod, 2); // Scale mail
    case "Fighter":
    case "Paladin": return 16; // Chain mail
    default: return 10 + dexMod;
  }
}

function computeStartingHp(cls: CharacterClass, conScore: number): number {
  const base = HIT_DICE[cls] ?? 8;
  return base + computeModifier(conScore);
}

function computeMaxHpForLevel(cls: CharacterClass, conScore: number, level: number): number {
  const hitDie = HIT_DICE[cls] ?? 8;
  const conMod = computeModifier(conScore);
  // Level 1: full hit die + CON mod. Levels 2+: avg roll + CON mod per level.
  const avgRoll = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + (level - 1) * (avgRoll + conMod);
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
          const ac = computeStartingAC(c.class, abilityScores.dexterity, abilityScores.constitution);
          const inventory = getStartingEquipment(c.class);
          const equipped = getDefaultEquipped(inventory);
          const identifiedItems = inventory.filter((item) => {
            const info = getItemInfo(item);
            return info?.isMagical;
          });

          return {
            isCreated: true,
            character: {
              ...c,
              abilityScores,
              racialTraits,
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
            },
          };
        }),

      equipItem: (item) =>
        set((s) => ({
          character: {
            ...s.character,
            equipped: s.character.equipped.includes(item)
              ? s.character.equipped
              : [...s.character.equipped, item],
          },
        })),

      unequipItem: (item) =>
        set((s) => ({
          character: {
            ...s.character,
            equipped: s.character.equipped.filter((i) => i !== item),
          },
        })),

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
              c.hp = 0;
              c.isUnconscious = true;
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
            // Also remove from equipped
            c.equipped = c.equipped.filter(
              (item) => !updates.removeItems!.includes(item)
            );
          }

          // Gold
          if (updates.goldChange) {
            c.gold = Math.max(0, c.gold + updates.goldChange);
          }

          // Rest tracking
          if (updates.lastRestTurn !== undefined) {
            c.lastRestTurn = updates.lastRestTurn;
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
