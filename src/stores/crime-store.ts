import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Crime, CrimeType, EvidenceLevel } from "@/lib/crimes";

interface CrimeStore {
  crimes: Crime[];
  addCrime: (crime: Omit<Crime, "id" | "evidenceLevel" | "hasWarrant" | "confronted">) => void;
  updateEvidence: (crimeId: string, level: EvidenceLevel) => void;
  issueWarrant: (crimeId: string) => void;
  markConfronted: (crimeId: string) => void;
  reset: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const useCrimeStore = create<CrimeStore>()(
  persist(
    (set) => ({
      crimes: [],

      addCrime: (crime) =>
        set((s) => ({
          crimes: [
            ...s.crimes,
            {
              ...crime,
              id: generateId(),
              evidenceLevel: "none" as EvidenceLevel,
              hasWarrant: false,
              confronted: false,
            },
          ],
        })),

      updateEvidence: (crimeId, level) =>
        set((s) => ({
          crimes: s.crimes.map((c) =>
            c.id === crimeId
              ? {
                  ...c,
                  evidenceLevel: level,
                  detectedTurn: c.detectedTurn ?? (level !== "none" ? Date.now() : undefined),
                  hasWarrant: level === "confirmed" ? true : c.hasWarrant,
                }
              : c
          ),
        })),

      issueWarrant: (crimeId) =>
        set((s) => ({
          crimes: s.crimes.map((c) =>
            c.id === crimeId ? { ...c, hasWarrant: true } : c
          ),
        })),

      markConfronted: (crimeId) =>
        set((s) => ({
          crimes: s.crimes.map((c) =>
            c.id === crimeId ? { ...c, confronted: true } : c
          ),
        })),

      reset: () => set({ crimes: [] }),
    }),
    { name: "dndquest-crimes" }
  )
);
