"use client";

import type { RollResult } from "@/types/world";
import { cn } from "@/lib/utils";

interface Props {
  roll: RollResult;
}

/**
 * Minimal inline dice roll display — single centered line with color coding.
 */
export function DiceRollDisplay({ roll }: Props) {
  const isSuccess = roll.success;

  const typeLabel =
    roll.type === "attack" ? "Attack"
    : roll.type === "save" ? "Save"
    : roll.type === "damage" ? "Damage"
    : roll.ability ? roll.ability.charAt(0).toUpperCase() + roll.ability.slice(1) : "Check";

  const resultLabel =
    roll.type === "attack"
      ? (isSuccess ? "HIT" : "MISS")
      : roll.type === "damage"
        ? `${roll.total} dmg`
        : (isSuccess ? "PASS" : "FAIL");

  const isCrit = roll.rolled === 20;
  const isFumble = roll.rolled === 1;

  return (
    <div className="flex justify-center my-2">
      <div
        className={cn(
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono border",
          isSuccess
            ? "bg-emerald-950/60 border-emerald-600/40 text-emerald-300"
            : "bg-red-950/60 border-red-600/40 text-red-300"
        )}
      >
        <span className="font-semibold uppercase tracking-wider opacity-70">{typeLabel}</span>
        <span className="text-muted-foreground">|</span>
        <span>
          {roll.rolled}
          {roll.modifier >= 0 ? "+" : ""}
          {roll.modifier} = <span className="font-bold">{roll.total}</span>
        </span>
        {roll.dc != null && (
          <>
            <span className="text-muted-foreground/50">vs DC {roll.dc}</span>
          </>
        )}
        <span className="text-muted-foreground">|</span>
        <span className={cn(
          "font-black uppercase",
          isSuccess ? "text-emerald-400" : "text-red-400"
        )}>
          {resultLabel}
        </span>
        {isCrit && <span className="text-amber-400 font-black">NAT 20!</span>}
        {isFumble && <span className="text-red-400 font-black">NAT 1!</span>}
      </div>
    </div>
  );
}
