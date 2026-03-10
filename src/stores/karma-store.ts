import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { KarmaEvent, FameEvent } from "@/lib/karma";
import type { Companion } from "@/types/companion";
import { getDisposition, calculateApprovalChange, COMPANION_TEMPLATES } from "@/types/companion";

interface KarmaStore {
  /** Karma event history */
  karmaHistory: KarmaEvent[];
  /** Fame event history */
  fameHistory: FameEvent[];
  /** Active companions */
  companions: Companion[];

  /** Add a karma event */
  addKarmaEvent: (event: KarmaEvent) => void;
  /** Add a fame event */
  addFameEvent: (event: FameEvent) => void;

  /** Recruit a companion by template ID */
  recruitCompanion: (templateId: string, turn: number) => void;

  /** Update companion approval based on a karma action */
  updateCompanionApproval: (karmaActionType: string) => void;

  /** Remove a companion (left or betrayed) */
  removeCompanion: (companionId: string) => void;

  /** Level up a companion to match character level */
  levelUpCompanion: (companionId: string, newLevel: number) => void;

  /** Heal a companion */
  healCompanion: (companionId: string, amount: number) => void;

  /** Damage a companion */
  damageCompanion: (companionId: string, amount: number) => void;

  /** Reset everything */
  reset: () => void;
}

export const useKarmaStore = create<KarmaStore>()(
  persist(
    (set) => ({
      karmaHistory: [],
      fameHistory: [],
      companions: [],

      addKarmaEvent: (event) =>
        set((s) => ({
          karmaHistory: [...s.karmaHistory, event],
        })),

      addFameEvent: (event) =>
        set((s) => ({
          fameHistory: [...s.fameHistory, event],
        })),

      recruitCompanion: (templateId, turn) =>
        set((s) => {
          // Don't recruit if already recruited
          if (s.companions.some((c) => c.id === templateId)) return s;

          const template = COMPANION_TEMPLATES.find((t) => t.id === templateId);
          if (!template) return s;

          const companion: Companion = {
            ...template,
            isRecruited: true,
            hasLeft: false,
            recruitedTurn: turn,
            personalQuestComplete: false,
          };

          return { companions: [...s.companions, companion] };
        }),

      updateCompanionApproval: (karmaActionType) =>
        set((s) => ({
          companions: s.companions.map((c) => {
            if (!c.isRecruited || c.hasLeft) return c;

            const change = calculateApprovalChange(c, karmaActionType);
            if (change === 0) return c;

            const newApproval = Math.max(-100, Math.min(100, c.approval + change));
            const newDisposition = getDisposition(newApproval);

            // If approval drops below -10, companion leaves
            if (newApproval < -10 && !c.hasLeft) {
              return { ...c, approval: newApproval, disposition: "hostile", hasLeft: true };
            }

            return { ...c, approval: newApproval, disposition: newDisposition };
          }),
        })),

      removeCompanion: (companionId) =>
        set((s) => ({
          companions: s.companions.map((c) =>
            c.id === companionId ? { ...c, hasLeft: true } : c
          ),
        })),

      levelUpCompanion: (companionId, newLevel) =>
        set((s) => ({
          companions: s.companions.map((c) => {
            if (c.id !== companionId || c.hasLeft) return c;
            const hpGain = (newLevel - c.level) * 5; // Simplified HP gain
            return {
              ...c,
              level: newLevel,
              maxHp: c.maxHp + hpGain,
              hp: Math.min(c.hp + hpGain, c.maxHp + hpGain),
              primaryMod: Math.floor((newLevel - 1) / 4) + 3,
            };
          }),
        })),

      healCompanion: (companionId, amount) =>
        set((s) => ({
          companions: s.companions.map((c) =>
            c.id === companionId ? { ...c, hp: Math.min(c.maxHp, c.hp + amount) } : c
          ),
        })),

      damageCompanion: (companionId, amount) =>
        set((s) => ({
          companions: s.companions.map((c) =>
            c.id === companionId ? { ...c, hp: Math.max(0, c.hp - amount) } : c
          ),
        })),

      reset: () => set({ karmaHistory: [], fameHistory: [], companions: [] }),
    }),
    {
      name: "dndquest-karma",
      partialize: (s) => ({
        karmaHistory: s.karmaHistory,
        fameHistory: s.fameHistory,
        companions: s.companions,
      }),
    }
  )
);
