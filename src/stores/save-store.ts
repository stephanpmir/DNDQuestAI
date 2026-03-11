import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SaveMetadata {
  /** ISO timestamp of the last auto-save */
  lastSavedAt: string | null;
  /** Character name at time of save */
  characterName: string | null;
  /** Character level at time of save */
  characterLevel: number | null;
  /** Current location at time of save */
  location: string | null;
  /** Turn count at time of save */
  turnCount: number | null;
}

interface SaveStore extends SaveMetadata {
  /** Record that an auto-save just occurred */
  recordSave: (meta: Omit<SaveMetadata, "lastSavedAt">) => void;
  reset: () => void;
}

const DEFAULT_STATE: SaveMetadata = {
  lastSavedAt: null,
  characterName: null,
  characterLevel: null,
  location: null,
  turnCount: null,
};

export const useSaveStore = create<SaveStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      recordSave: (meta) =>
        set({
          lastSavedAt: new Date().toISOString(),
          ...meta,
        }),

      reset: () => set(DEFAULT_STATE),
    }),
    { name: "dndquest-save" }
  )
);
