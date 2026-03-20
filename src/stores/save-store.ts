import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameSnapshot } from "@/lib/save-snapshot";

/** Slot identifiers — "auto" is reserved for auto-save */
export type SlotId = "auto" | "slot-1" | "slot-2" | "slot-3";
export const MANUAL_SLOTS: SlotId[] = ["slot-1", "slot-2", "slot-3"];
export const ALL_SLOTS: SlotId[] = ["auto", ...MANUAL_SLOTS];

export interface SaveSlot {
  /** Which slot this occupies */
  slotId: SlotId;
  /** ISO timestamp when saved */
  savedAt: string;
  /** Character name at time of save */
  characterName: string;
  /** Character level at time of save */
  characterLevel: number;
  /** Current location at time of save */
  location: string;
  /** Turn count at time of save */
  turnCount: number;
  /** Full game state snapshot */
  snapshot: GameSnapshot;
}

interface SaveStore {
  /** All occupied save slots keyed by slotId */
  slots: Partial<Record<SlotId, SaveSlot>>;

  /** Save a snapshot to a specific slot */
  saveToSlot: (slotId: SlotId, slot: Omit<SaveSlot, "slotId">) => void;
  /** Delete a save slot */
  deleteSlot: (slotId: SlotId) => void;
  /** Reset all slots */
  reset: () => void;
}

export const useSaveStore = create<SaveStore>()(
  persist(
    (set) => ({
      slots: {},

      saveToSlot: (slotId, data) =>
        set((s) => ({
          slots: {
            ...s.slots,
            [slotId]: { ...data, slotId },
          },
        })),

      deleteSlot: (slotId) =>
        set((s) => {
          const next = { ...s.slots };
          delete next[slotId];
          return { slots: next };
        }),

      reset: () => set({ slots: {} }),
    }),
    { name: "dndquest-save" }
  )
);
