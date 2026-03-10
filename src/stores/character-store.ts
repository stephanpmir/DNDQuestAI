import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Character, Race, CharacterClass, AbilityScores } from "@/types/character";
import { createDefaultCharacter } from "@/types/character";

interface CharacterStore {
  character: Character;
  isCreated: boolean;
  setName: (name: string) => void;
  setRace: (race: Race) => void;
  setClass: (cls: CharacterClass) => void;
  setAbilityScores: (scores: AbilityScores) => void;
  finalizeCharacter: () => void;
  updateFromGameState: (updates: {
    hpChange?: number;
    newItems?: string[];
    removeItems?: string[];
    goldChange?: number;
    xpGained?: number;
  }) => void;
  reset: () => void;
}

function computeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function computeStartingHp(cls: CharacterClass, conScore: number): number {
  const hitDice: Record<string, number> = {
    Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
    Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
    Sorcerer: 6, Wizard: 6,
  };
  const base = hitDice[cls] ?? 8;
  return base + computeModifier(conScore);
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set) => ({
      character: createDefaultCharacter(),
      isCreated: false,

      setName: (name) =>
        set((s) => ({ character: { ...s.character, name } })),

      setRace: (race) =>
        set((s) => ({ character: { ...s.character, race } })),

      setClass: (cls) =>
        set((s) => ({ character: { ...s.character, class: cls } })),

      setAbilityScores: (scores) =>
        set((s) => ({ character: { ...s.character, abilityScores: scores } })),

      finalizeCharacter: () =>
        set((s) => {
          const hp = computeStartingHp(
            s.character.class,
            s.character.abilityScores.constitution
          );
          const ac = 10 + computeModifier(s.character.abilityScores.dexterity);
          const inventory = ["Backpack", "Waterskin", "Rations (3 days)"];
          return {
            isCreated: true,
            character: { ...s.character, hp, maxHp: hp, ac, inventory },
          };
        }),

      updateFromGameState: (updates) =>
        set((s) => {
          const c = { ...s.character };
          if (updates.hpChange) {
            c.hp = Math.max(0, Math.min(c.maxHp, c.hp + updates.hpChange));
          }
          if (updates.newItems) {
            c.inventory = [...c.inventory, ...updates.newItems];
          }
          if (updates.removeItems) {
            c.inventory = c.inventory.filter(
              (item) => !updates.removeItems!.includes(item)
            );
          }
          if (updates.goldChange) {
            c.gold = Math.max(0, c.gold + updates.goldChange);
          }
          return { character: c };
        }),

      reset: () =>
        set({ character: createDefaultCharacter(), isCreated: false }),
    }),
    { name: "dndquest-character" }
  )
);
