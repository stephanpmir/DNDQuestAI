import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "@/types/game";

interface GameStore {
  messages: ChatMessage[];
  location: string;
  questLog: string[];
  turnCount: number;
  isLoading: boolean;
  campaignStarted: boolean;
  /** Set to true after restoring a save; cleared after welcome-back fires */
  justLoaded: boolean;
  /** Chat summary from the loaded save for DM recap context */
  loadedChatSummary: string | null;

  addMessage: (msg: ChatMessage) => void;
  setLocation: (location: string) => void;
  addQuest: (quest: string) => void;
  completeQuest: (quest: string) => void;
  incrementTurn: () => void;
  setLoading: (loading: boolean) => void;
  setCampaignStarted: (started: boolean) => void;
  clearJustLoaded: () => void;
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
      justLoaded: false,
      loadedChatSummary: null,

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
      clearJustLoaded: () => set({ justLoaded: false, loadedChatSummary: null }),

      reset: () =>
        set({
          messages: [],
          location: "Unknown",
          questLog: [],
          turnCount: 0,
          isLoading: false,
          campaignStarted: false,
          justLoaded: false,
          loadedChatSummary: null,
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
      }),
    }
  )
);
