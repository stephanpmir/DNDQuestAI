/**
 * Combat-specific types — D&D 5e conditions, combatant state, turn actions.
 */

// ── D&D 5e Conditions ────────────────────────────────────────────

export type Condition =
  | "blinded"
  | "charmed"
  | "deafened"
  | "exhaustion"
  | "frightened"
  | "grappled"
  | "incapacitated"
  | "invisible"
  | "paralyzed"
  | "petrified"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned"
  | "unconscious";

// ── Concentration Spell Tracking ─────────────────────────────────

export interface ConcentrationSpell {
  spellName: string;
  casterLevel: number;
  dc: number;
  durationTurns: number;
  turnsRemaining: number;
  effect: string;
}

// ── Combatant State ──────────────────────────────────────────────

export interface CombatantState {
  conditions: Set<Condition>;
  concentrationSpell: ConcentrationSpell | null;
  reactionUsed: boolean;
  bonusActionUsed: boolean;
  sneakAttackUsedThisTurn: boolean;
  turnsUntilConditionExpires: Partial<Record<Condition, number>>;
}

// ── Turn Action ──────────────────────────────────────────────────

export interface TurnAction {
  type:
    | "attack"
    | "cast_spell"
    | "dash"
    | "dodge"
    | "disengage"
    | "hide"
    | "help"
    | "ready"
    | "use_item"
    | "grapple"
    | "shove"
    | "second_wind"
    | "flee"
    | "other";
  /** Spell name or specific ability */
  subType?: string;
  /** Condition this action applies */
  targetCondition?: Condition;
  /** Whether this action uses a spell slot */
  usesSpellSlot?: boolean;
  isBonusAction: boolean;
  isReaction: boolean;
}

// ── Helper: create default combatant state ───────────────────────

export function createDefaultCombatantState(): CombatantState {
  return {
    conditions: new Set(),
    concentrationSpell: null,
    reactionUsed: false,
    bonusActionUsed: false,
    sneakAttackUsedThisTurn: false,
    turnsUntilConditionExpires: {},
  };
}
