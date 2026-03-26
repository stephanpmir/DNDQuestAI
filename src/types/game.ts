import type { Character } from "./character";
import type { RollResult } from "./world";
import type { Fact } from "@/lib/engine/fact-ledger";

export type GamePhase = "exploration" | "combat" | "skill_check" | "looting" | "dialogue";

export interface CombatState {
  round: number;
  enemyName: string;
  initiativeOrder: string[];
  playerAttackRoll?: RollResult;
  damageDealt?: number;
  enemyCondition: string;
  enemyAttackTotal?: number;
  damageTaken?: number;
  isCriticalHit?: boolean;
  flavorText?: string;
}

export interface LootState {
  items: string[];
  gold?: number;
  selectedItems: string[];
}

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
  /** Phase this message belongs to */
  phase?: GamePhase;
  /** Combat state for combat phase messages */
  combatState?: CombatState;
  /** Loot available after combat */
  lootState?: LootState;
  /** NPC name for dialogue phase */
  npcName?: string;
  /** Rules reference card content */
  rulesReference?: { title: string; text: string };
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
  /** Rules reference card (when player asks a rules question) */
  rulesReference?: {
    title: string;
    text: string;
  };
}
