import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HighScoreEntry {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
  gold: number;
  turns: number;
  causeOfDeath: string;
  timestamp: number;
}

interface HighScoreStore {
  scores: HighScoreEntry[];
  addScore: (entry: HighScoreEntry) => void;
  getTopScores: (limit?: number) => HighScoreEntry[];
}

export const useHighScoreStore = create<HighScoreStore>()(
  persist(
    (set, get) => ({
      scores: [],

      addScore: (entry) =>
        set((s) => ({
          scores: [...s.scores, entry]
            .sort((a, b) => {
              // Sort by level desc, then XP desc, then gold desc
              if (b.level !== a.level) return b.level - a.level;
              if (b.xp !== a.xp) return b.xp - a.xp;
              return b.gold - a.gold;
            })
            .slice(0, 50), // Keep top 50
        })),

      getTopScores: (limit = 10) => get().scores.slice(0, limit),
    }),
    { name: "dndquest-highscores" }
  )
);
