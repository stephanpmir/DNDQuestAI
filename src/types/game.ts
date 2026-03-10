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
  /** Karma change to display as floating indicator */
  karmaChange?: number;
  /** Fame change to display as floating indicator */
  fameChange?: number;
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
    lastRestTurn?: number;
  };
  /** Engine outcome details */
  engineOutcome?: {
    roll?: RollResult;
    escalationHint?: boolean;
    restDenied?: boolean;
    deathSaveResult?: "nat20" | "nat1" | "success" | "failure";
    damageDealt?: number;
    isCriticalHit?: boolean;
    damageTaken?: number;
    itemNotFound?: boolean;
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
  /** Karma change from this action */
  karmaChange?: { type: string; amount: number; description: string };
  /** Fame change from this action */
  fameChange?: number;
  /** Divine intervention that occurred */
  divineEffect?: {
    source: "good_god" | "evil_god";
    type: "blessing" | "punishment" | "temptation";
    description: string;
    rollModifier: number;
  };
}
