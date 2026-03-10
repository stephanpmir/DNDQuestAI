/** Structured world event records — store, don't summarize. */

export interface WorldEvent {
  id: string;
  turn: number;
  timestamp: number;
  type: "combat" | "exploration" | "dialogue" | "quest" | "trade" | "rest" | "skill_check";
  location: string;
  summary: string;
  /** NPCs involved in this event */
  npcs: string[];
  /** Items gained or lost */
  itemChanges: { item: string; gained: boolean }[];
  /** Outcome of any dice rolls */
  rollResult?: RollResult;
}

export interface RollResult {
  type: "attack" | "save" | "check" | "damage";
  ability?: string;
  dc?: number;
  rolled: number;
  modifier: number;
  total: number;
  success: boolean;
}

export interface NPC {
  name: string;
  firstMetTurn: number;
  lastSeenTurn: number;
  location: string;
  disposition: "friendly" | "neutral" | "hostile" | "unknown";
  notes: string[];
}

export interface LocationRecord {
  name: string;
  firstVisitTurn: number;
  lastVisitTurn: number;
  description: string;
  connectedTo: string[];
  npcsPresent: string[];
}

/** What the rules engine decides before the LLM narrates. */
export interface EngineOutcome {
  /** Did an action require a roll? */
  roll?: RollResult;
  /** Deterministic HP change from combat/traps */
  hpChange: number;
  /** Items gained */
  itemsGained: string[];
  /** Items lost/consumed */
  itemsLost: string[];
  /** Gold change */
  goldChange: number;
  /** XP earned */
  xpGained: number;
  /** Location change if any */
  locationChange?: string;
  /** New quest triggered */
  newQuest?: string;
  /** Quest completed */
  completeQuest?: string;
  /** Escalation hint injected (from loop detection) */
  escalationHint?: string;
  /** Any new NPCs to register */
  newNpcs: string[];
  /** Rest was denied due to abuse prevention */
  restDenied?: boolean;
  /** Track the turn of last rest */
  lastRestTurn?: number;
  /** Death save result for unconscious characters */
  deathSaveResult?: "nat20" | "nat1" | "success" | "failure";
  /** Damage dealt by player attack */
  damageDealt?: number;
  /** Was it a critical hit? */
  isCriticalHit?: boolean;
  /** Damage taken from enemy counterattack */
  damageTaken?: number;
  /** Player tried to use an item they don't have */
  itemNotFound?: boolean;
  /** Karma change from this action */
  karmaChange?: { type: string; amount: number; description: string };
  /** Divine intervention effect */
  divineEffect?: {
    source: "good_god" | "evil_god";
    type: "blessing" | "punishment" | "temptation";
    description: string;
    rollModifier: number;
  };
}

/** What the LLM receives to narrate — it does NOT decide outcomes. */
export interface NarrationContext {
  playerAction: string;
  engineOutcome: EngineOutcome;
  recentEvents: WorldEvent[];
  relevantNpcs: NPC[];
  currentLocation: LocationRecord | null;
}
