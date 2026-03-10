import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorldEvent, NPC, LocationRecord } from "@/types/world";
import type { Fact } from "@/lib/engine/fact-ledger";
import { createFact, shouldPromoteToAnchor, getAnchors } from "@/lib/engine/fact-ledger";

interface WorldStore {
  /** Structured event log */
  events: WorldEvent[];
  /** All NPCs encountered */
  npcs: NPC[];
  /** All locations visited */
  locations: LocationRecord[];
  /** Append-only fact ledger — the source of truth */
  facts: Fact[];

  // ── Events ──
  addEvent: (event: WorldEvent) => void;

  // ── NPCs ──
  registerNpc: (name: string, turn: number, location: string) => void;
  updateNpcDisposition: (name: string, disposition: NPC["disposition"], recognized?: boolean) => void;

  // ── Locations ──
  visitLocation: (name: string, turn: number, description?: string) => void;

  // ── Fact Ledger ──
  addFact: (fact: Fact) => void;
  addFacts: (facts: Fact[]) => void;
  bumpFactReferences: (factIds: string[]) => void;
  promoteToAnchor: (factIds: string[]) => void;
  supersedeFact: (factId: string, newFactId: string) => void;

  // ── Queries ──
  getEventsAtLocation: (location: string) => WorldEvent[];
  getRecentEvents: (count: number) => WorldEvent[];
  getNpc: (name: string) => NPC | undefined;
  getLocation: (name: string) => LocationRecord | undefined;

  // ── Lifecycle ──
  reset: () => void;
  /** Initialize character identity anchors (called once on game start) */
  initializeAnchors: (charName: string, race: string, cls: string) => void;
}

export const useWorldStore = create<WorldStore>()(
  persist(
    (set, get) => ({
      events: [],
      npcs: [],
      locations: [],
      facts: [],

      // ── Events ──
      addEvent: (event) =>
        set((s) => ({ events: [...s.events, event] })),

      // ── NPCs ──
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

      updateNpcDisposition: (name, disposition, recognized) =>
        set((s) => ({
          npcs: s.npcs.map((n) =>
            n.name.toLowerCase() === name.toLowerCase()
              ? { ...n, disposition, recognizedPlayer: recognized ?? n.recognizedPlayer }
              : n
          ),
        })),

      // ── Locations ──
      visitLocation: (name, turn, description) =>
        set((s) => {
          const existing = s.locations.find(
            (l) => l.name.toLowerCase() === name.toLowerCase()
          );
          if (existing) {
            return {
              locations: s.locations.map((l) =>
                l.name.toLowerCase() === name.toLowerCase()
                  ? { ...l, lastVisitTurn: turn, description: description || l.description }
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

      // ── Fact Ledger ──
      addFact: (fact) =>
        set((s) => ({ facts: [...s.facts, fact] })),

      addFacts: (newFacts) =>
        set((s) => ({ facts: [...s.facts, ...newFacts] })),

      bumpFactReferences: (factIds) =>
        set((s) => {
          const idSet = new Set(factIds);
          const updatedFacts = s.facts.map((f) =>
            idSet.has(f.id) ? { ...f, referenceCount: f.referenceCount + 1 } : f
          );
          // Check for auto-promotions after bumping
          const currentAnchorCount = getAnchors(updatedFacts).length;
          return {
            facts: updatedFacts.map((f) => {
              if (idSet.has(f.id) && shouldPromoteToAnchor(f, currentAnchorCount)) {
                return { ...f, isAnchor: true };
              }
              return f;
            }),
          };
        }),

      promoteToAnchor: (factIds) =>
        set((s) => {
          const idSet = new Set(factIds);
          return {
            facts: s.facts.map((f) =>
              idSet.has(f.id) ? { ...f, isAnchor: true } : f
            ),
          };
        }),

      supersedeFact: (factId, newFactId) =>
        set((s) => ({
          facts: s.facts.map((f) =>
            f.id === factId ? { ...f, supersededBy: newFactId } : f
          ),
        })),

      // ── Queries ──
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

      // ── Lifecycle ──
      reset: () => set({ events: [], npcs: [], locations: [], facts: [] }),

      initializeAnchors: (charName, race, cls) =>
        set((s) => {
          // Only initialize if no character anchors exist yet
          if (s.facts.some((f) => f.category === "character" && f.isAnchor)) {
            return {};
          }
          const anchors: Fact[] = [
            createFact("anchor_identity", 0, "character", `The player is ${charName}, a ${race} ${cls}`, [charName.toLowerCase(), race.toLowerCase(), cls.toLowerCase()], { isAnchor: true }),
          ];
          return { facts: [...s.facts, ...anchors] };
        }),
    }),
    {
      name: "dndquest-world",
      partialize: (s) => ({
        events: s.events,
        npcs: s.npcs,
        locations: s.locations,
        facts: s.facts,
      }),
    }
  )
);
