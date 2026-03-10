import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorldEvent, NPC, LocationRecord } from "@/types/world";

interface WorldStore {
  /** Structured event log — the source of truth for "what happened" */
  events: WorldEvent[];
  /** All NPCs the player has encountered */
  npcs: NPC[];
  /** All locations the player has visited */
  locations: LocationRecord[];

  addEvent: (event: WorldEvent) => void;
  registerNpc: (name: string, turn: number, location: string) => void;
  updateNpcDisposition: (name: string, disposition: NPC["disposition"]) => void;
  visitLocation: (name: string, turn: number, description?: string) => void;
  getEventsAtLocation: (location: string) => WorldEvent[];
  getRecentEvents: (count: number) => WorldEvent[];
  getNpc: (name: string) => NPC | undefined;
  getLocation: (name: string) => LocationRecord | undefined;
  reset: () => void;
}

export const useWorldStore = create<WorldStore>()(
  persist(
    (set, get) => ({
      events: [],
      npcs: [],
      locations: [],

      addEvent: (event) =>
        set((s) => ({ events: [...s.events, event] })),

      registerNpc: (name, turn, location) =>
        set((s) => {
          const existing = s.npcs.find(
            (n) => n.name.toLowerCase() === name.toLowerCase()
          );
          if (existing) {
            return {
              npcs: s.npcs.map((n) =>
                n.name.toLowerCase() === name.toLowerCase()
                  ? { ...n, lastSeenTurn: turn, location }
                  : n
              ),
            };
          }
          return {
            npcs: [
              ...s.npcs,
              {
                name,
                firstMetTurn: turn,
                lastSeenTurn: turn,
                location,
                disposition: "unknown" as const,
                notes: [],
              },
            ],
          };
        }),

      updateNpcDisposition: (name, disposition) =>
        set((s) => ({
          npcs: s.npcs.map((n) =>
            n.name.toLowerCase() === name.toLowerCase()
              ? { ...n, disposition }
              : n
          ),
        })),

      visitLocation: (name, turn, description) =>
        set((s) => {
          const existing = s.locations.find(
            (l) => l.name.toLowerCase() === name.toLowerCase()
          );
          if (existing) {
            return {
              locations: s.locations.map((l) =>
                l.name.toLowerCase() === name.toLowerCase()
                  ? { ...l, lastVisitTurn: turn }
                  : l
              ),
            };
          }
          return {
            locations: [
              ...s.locations,
              {
                name,
                firstVisitTurn: turn,
                lastVisitTurn: turn,
                description: description ?? "",
                connectedTo: [],
                npcsPresent: [],
              },
            ],
          };
        }),

      getEventsAtLocation: (location) =>
        get().events.filter(
          (e) => e.location.toLowerCase() === location.toLowerCase()
        ),

      getRecentEvents: (count) => get().events.slice(-count),

      getNpc: (name) =>
        get().npcs.find(
          (n) => n.name.toLowerCase() === name.toLowerCase()
        ),

      getLocation: (name) =>
        get().locations.find(
          (l) => l.name.toLowerCase() === name.toLowerCase()
        ),

      reset: () => set({ events: [], npcs: [], locations: [] }),
    }),
    {
      name: "dndquest-world",
      partialize: (s) => ({
        events: s.events,
        npcs: s.npcs,
        locations: s.locations,
      }),
    }
  )
);
