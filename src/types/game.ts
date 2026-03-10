import type { Character } from "./character";
import type { RollResult } from "./world";
import type { Fact } from "@/lib/engine/fact-ledger";

export interface GameState {
  character: Character;
  location: string;
  questLog: string[];
  turnCount: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  narrative: string;
  gameState?: Partial<GameState>;
  timestamp: number;
  /** Dice roll result to display inline */
  rollResult?: RollResult;
}

/** The structured JSON the API returns. */
export interface DMResponsePayload {
  narrative: string;
  gameStateUpdate: {
    hpChange?: number;
    newItems?: string[];
    removeItems?: string[];
    goldChange?: number;
    locationChange?: string;
    newQuest?: string;
    completeQuest?: string;
    xpGained?: number;
  };
  /** Engine outcome details */
  engineOutcome?: {
    roll?: RollResult;
    escalationHint?: boolean;
  };
  /** Fact ledger updates */
  factUpdates?: {
    newFacts: Fact[];
    bumpedFactIds: string[];
    promotedAnchors: string[];
  };
  /** New NPCs detected */
  newNpcs?: string[];
  /** Number of contradictions caught */
  contradictions?: number;
}
