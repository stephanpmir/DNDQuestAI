import type { Character } from "./character";
import type { RollResult } from "./world";

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

/** The structured JSON the AI DM returns alongside narrative text. */
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
  /** Engine outcome details (roll results, etc.) */
  engineOutcome?: {
    roll?: RollResult;
    escalationHint?: boolean;
  };
  /** New NPCs detected by guardrails */
  newNpcs?: string[];
  /** Validation warnings */
  warnings?: string[];
}
