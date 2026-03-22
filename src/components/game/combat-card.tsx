"use client";

import type { CombatState } from "@/types/game";
import { cn } from "@/lib/utils";

interface Props {
  combat: CombatState;
}

export function CombatCard({ combat }: Props) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-800/50 bg-red-950/30 p-4 space-y-3">
      {/* Header: round + initiative */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-red-400">
          Combat — Round {combat.round}
        </span>
        <div className="flex gap-1.5 text-[10px] text-muted-foreground">
          {combat.initiativeOrder.map((name) => (
            <span
              key={name}
              className="rounded bg-muted px-1.5 py-0.5"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Player attack */}
      {combat.playerAttackRoll && (
        <div className="space-y-1">
          <Row
            label="Your attack"
            value={`rolled ${combat.playerAttackRoll.rolled}+${combat.playerAttackRoll.modifier} = ${combat.playerAttackRoll.total} vs AC ${combat.playerAttackRoll.dc ?? "?"}`}
            success={combat.playerAttackRoll.success}
          />
          {combat.playerAttackRoll.success && combat.damageDealt != null && (
            <Row
              label="Damage dealt"
              value={`${combat.damageDealt} HP${combat.isCriticalHit ? " (CRIT!)" : ""}`}
              success
              accent="text-red-400"
            />
          )}
        </div>
      )}

      {/* Enemy condition */}
      <div className="text-center text-xs italic text-muted-foreground">
        {combat.enemyName}: {combat.enemyCondition}
      </div>

      {/* Enemy counterattack */}
      {combat.damageTaken != null && combat.damageTaken > 0 && (
        <Row
          label={`${combat.enemyName} strikes back`}
          value={`${combat.damageTaken} damage taken`}
          success={false}
          accent="text-red-400"
        />
      )}

      {/* Short DM flavor */}
      {combat.flavorText && (
        <p className="text-xs text-muted-foreground/80 text-center pt-1 border-t border-red-800/30">
          {combat.flavorText}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  success,
  accent,
}: {
  label: string;
  value: string;
  success: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs font-mono">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold",
          accent ?? (success ? "text-emerald-400" : "text-red-400")
        )}
      >
        {value}
      </span>
    </div>
  );
}
