import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, GamePhase, LootState } from "@/types/game";

interface GameStore {
  messages: ChatMessage[];
  location: string;
  questLog: string[];
  turnCount: number;
  isLoading: boolean;
  campaignStarted: boolean;
  gamePhase: GamePhase;
  pendingLoot: LootState | null;
  combatRound: number;

  addMessage: (msg: ChatMessage) => void;
  setLocation: (location: string) => void;
  addQuest: (quest: string) => void;
  completeQuest: (quest: string) => void;
  incrementTurn: () => void;
  setLoading: (loading: boolean) => void;
  setCampaignStarted: (started: boolean) => void;
  setGamePhase: (phase: GamePhase) => void;
  setPendingLoot: (loot: LootState | null) => void;
  incrementCombatRound: () => void;
  resetCombatRound: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      messages: [],
      location: "Unknown",
      questLog: [],
      turnCount: 0,
      isLoading: false,
      campaignStarted: false,
      gamePhase: "exploration" as GamePhase,
      pendingLoot: null,
      combatRound: 0,

      addMessage: (msg) =>
        set((s) => ({ messages: [...s.messages, msg] })),

      setLocation: (location) => set({ location }),

      addQuest: (quest) =>
        set((s) => ({
          questLog: s.questLog.includes(quest)
            ? s.questLog
            : [...s.questLog, quest],
        })),

      completeQuest: (quest) =>
        set((s) => ({
          questLog: s.questLog.filter((q) => q !== quest),
        })),

      incrementTurn: () =>
        set((s) => ({ turnCount: s.turnCount + 1 })),

      setLoading: (isLoading) => set({ isLoading }),
      setCampaignStarted: (campaignStarted) => set({ campaignStarted }),
      setGamePhase: (gamePhase) => set({ gamePhase }),
      setPendingLoot: (pendingLoot) => set({ pendingLoot }),
      incrementCombatRound: () =>
        set((s) => ({ combatRound: s.combatRound + 1 })),
      resetCombatRound: () => set({ combatRound: 0 }),

      reset: () =>
        set({
          messages: [],
          location: "Unknown",
          questLog: [],
          turnCount: 0,
          isLoading: false,
          campaignStarted: false,
          gamePhase: "exploration" as GamePhase,
          pendingLoot: null,
          combatRound: 0,
        }),
    }),
    {
      name: "dndquest-game",
      partialize: (s) => ({
        messages: s.messages,
        location: s.location,
        questLog: s.questLog,
        turnCount: s.turnCount,
        campaignStarted: s.campaignStarted,
        gamePhase: s.gamePhase,
        combatRound: s.combatRound,
      }),
    }
  )
);
