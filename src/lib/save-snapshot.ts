/**
 * Full game state snapshot — captures all store data into a single
 * serialisable object that can be saved / restored.
 */

import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { useWorldStore } from "@/stores/world-store";
import { useCrimeStore } from "@/stores/crime-store";

/** Shape of data that each Zustand persist store writes under its `state` key */
export interface GameSnapshot {
  character: {
    character: ReturnType<typeof useCharacterStore.getState>["character"];
    isCreated: boolean;
  };
  game: {
    messages: ReturnType<typeof useGameStore.getState>["messages"];
    location: string;
    questLog: string[];
    turnCount: number;
    campaignStarted: boolean;
  };
  karma: {
    karmaHistory: ReturnType<typeof useKarmaStore.getState>["karmaHistory"];
    fameHistory: ReturnType<typeof useKarmaStore.getState>["fameHistory"];
    companions: ReturnType<typeof useKarmaStore.getState>["companions"];
  };
  world: {
    events: ReturnType<typeof useWorldStore.getState>["events"];
    npcs: ReturnType<typeof useWorldStore.getState>["npcs"];
    locations: ReturnType<typeof useWorldStore.getState>["locations"];
    facts: ReturnType<typeof useWorldStore.getState>["facts"];
  };
  crime: {
    crimes: ReturnType<typeof useCrimeStore.getState>["crimes"];
  };
}

/** Capture the current state of all stores into a snapshot. */
export function captureSnapshot(): GameSnapshot {
  const cs = useCharacterStore.getState();
  const gs = useGameStore.getState();
  const ks = useKarmaStore.getState();
  const ws = useWorldStore.getState();
  const cr = useCrimeStore.getState();

  return {
    character: { character: cs.character, isCreated: cs.isCreated },
    game: {
      messages: gs.messages,
      location: gs.location,
      questLog: gs.questLog,
      turnCount: gs.turnCount,
      campaignStarted: gs.campaignStarted,
    },
    karma: {
      karmaHistory: ks.karmaHistory,
      fameHistory: ks.fameHistory,
      companions: ks.companions,
    },
    world: {
      events: ws.events,
      npcs: ws.npcs,
      locations: ws.locations,
      facts: ws.facts,
    },
    crime: { crimes: cr.crimes },
  };
}

/** Restore all stores from a previously captured snapshot. */
export function restoreSnapshot(snap: GameSnapshot): void {
  // Restore each store by directly setting state
  useCharacterStore.setState({
    character: snap.character.character,
    isCreated: snap.character.isCreated,
  });

  useGameStore.setState({
    messages: snap.game.messages,
    location: snap.game.location,
    questLog: snap.game.questLog,
    turnCount: snap.game.turnCount,
    campaignStarted: snap.game.campaignStarted,
    isLoading: false,
  });

  useKarmaStore.setState({
    karmaHistory: snap.karma.karmaHistory,
    fameHistory: snap.karma.fameHistory,
    companions: snap.karma.companions,
  });

  useWorldStore.setState({
    events: snap.world.events,
    npcs: snap.world.npcs,
    locations: snap.world.locations,
    facts: snap.world.facts,
  });

  useCrimeStore.setState({
    crimes: snap.crime.crimes,
  });
}

const PENDING_SNAPSHOT_KEY = "dndquest-pending-snapshot";

/**
 * Stash a snapshot for deferred restore. The game page will pick it up
 * after all Zustand stores have finished hydrating from localStorage,
 * preventing the persist middleware from overwriting the loaded state.
 */
export function stashSnapshotForRestore(snap: GameSnapshot): void {
  sessionStorage.setItem(PENDING_SNAPSHOT_KEY, JSON.stringify(snap));
}

/**
 * Check for and apply a stashed snapshot. Returns true if one was found
 * and applied. Should be called on the game page after hydration.
 */
export function applyPendingSnapshot(): boolean {
  const raw = sessionStorage.getItem(PENDING_SNAPSHOT_KEY);
  if (!raw) return false;
  sessionStorage.removeItem(PENDING_SNAPSHOT_KEY);
  try {
    const snap = JSON.parse(raw) as GameSnapshot;
    restoreSnapshot(snap);
    return true;
  } catch {
    return false;
  }
}
