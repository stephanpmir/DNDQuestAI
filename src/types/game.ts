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
  /** Scene image prompt for AI-generated scene illustration */
  sceneImagePrompt?: string;
}

/** The structured JSON the API returns. */
export interface DMResponsePayload {
  narrative: string;
  sceneImagePrompt?: string;
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
    restType?: import("@/lib/resources").RestType;
    raging?: boolean;
    lastHealTurn?: number;
    lastTravelEncounterTurn?: number;
    resourceUpdates?: import("@/lib/resources").ResourcePool;
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
    equipItem?: string;
    identifyItem?: string;
  };
  /** Fact ledger updates */
  factUpdates?: {
    newFacts: Fact[];
    bumpedFactIds: string[];
    promotedAnchors: string[];
  };
  /** New NPCs detected */
  newNpcs?: string[];
  /** Dispositions computed for new NPCs based on fame/karma check */
  npcDispositions?: {
    name: string;
    disposition: "friendly" | "neutral" | "cautious" | "hostile";
    recognized: boolean;
    fameRoll: number;
    fameDC: number;
  }[];
  /** Number of contradictions caught */
  contradictions?: number;
  /** Karma change from this action */
  karmaChange?: { type: string; amount: number; description: string };
  /** Fame change from this action */
  fameChange?: number;
  /** Reason for fame change (for history log) */
  fameReason?: string;
  /** Category of fame change */
  fameCategory?: "quest" | "combat" | "crime" | "social" | "decay";
  /** Divine intervention that occurred */
  divineEffect?: {
    source: "good_god" | "evil_god";
    type: "blessing" | "punishment" | "temptation";
    description: string;
    rollModifier: number;
  };
  /** Crime detected from player action */
  crimeDetected?: {
    type: string;
    description: string;
    location: string;
  };
  /** Guard investigation result (background check) */
  guardInvestigation?: {
    crimeId: string;
    newEvidenceLevel: string;
    narrativeHint: string;
  };
  /** Guard confrontation triggered */
  guardConfrontation?: {
    crimeType: string;
    crimeLocation: string;
  };
  /** Trade result */
  tradeResult?: {
    type: "buy" | "sell";
    item: string;
    price: number;
    success: boolean;
    reason?: string;
  };
  /** Item pickup result */
  pickupResult?: {
    item: string;
    success: boolean;
    reason?: string;
  };
  /** Item drop result */
  dropResult?: {
    item: string;
    success: boolean;
  };
  /** Items to add to the ground (loot drops, dropped items) */
  addToGround?: string[];
  /** Items to remove from the ground (picked up) */
  removeFromGround?: string[];
}
