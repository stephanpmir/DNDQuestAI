"use client";

import type { RollResult } from "@/types/world";
import { cn } from "@/lib/utils";

interface Props {
  roll: RollResult;
}

/**
 * Beautiful centered dice roll illustration.
 * Shows the d20 face, modifiers, DC, and result with visual flair.
 */
export function DiceRollDisplay({ roll }: Props) {
  const isSuccess = roll.success;

  const typeLabel =
    roll.type === "attack" ? "Attack Roll"
    : roll.type === "save" ? "Saving Throw"
    : roll.type === "damage" ? "Damage"
    : `${roll.ability ? roll.ability.charAt(0).toUpperCase() + roll.ability.slice(1) + " " : ""}Check`;

  const resultLabel =
    roll.type === "attack"
      ? (isSuccess ? "HIT" : "MISS")
      : roll.type === "damage"
        ? `${roll.total} damage`
        : (isSuccess ? "SUCCESS" : "FAILURE");

  const isCrit = roll.rolled === 20;
  const isFumble = roll.rolled === 1;

  return (
    <div className="flex justify-center my-4">
      <div
        className={cn(
          "relative flex flex-col items-center gap-3 px-8 py-5 rounded-xl border-2 min-w-[280px] max-w-[340px]",
          "bg-gradient-to-b shadow-lg",
          isSuccess
            ? "from-emerald-950/80 to-emerald-950/40 border-emerald-600/60 shadow-emerald-900/30"
            : "from-red-950/80 to-red-950/40 border-red-600/60 shadow-red-900/30"
        )}
      >
        {/* Type label */}
        <div className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.2em]",
          isSuccess ? "text-emerald-400/70" : "text-red-400/70"
        )}>
          {typeLabel}
        </div>

        {/* The d20 face */}
        <div className="relative">
          {/* Diamond/d20 shape */}
          <div
            className={cn(
              "w-20 h-20 rotate-45 rounded-lg border-2 flex items-center justify-center",
              "shadow-inner",
              isCrit
                ? "border-amber-400 bg-amber-950/60 shadow-amber-500/20"
                : isFumble
                  ? "border-red-400 bg-red-950/60 shadow-red-500/20"
                  : isSuccess
                    ? "border-emerald-500/60 bg-emerald-950/40"
                    : "border-red-500/60 bg-red-950/40"
            )}
          >
            <span
              className={cn(
                "-rotate-45 text-3xl font-black tabular-nums",
                isCrit ? "text-amber-300" : isFumble ? "text-red-300" : isSuccess ? "text-emerald-200" : "text-red-200"
              )}
            >
              {roll.rolled}
            </span>
          </div>
          {/* Crit / fumble badge */}
          {(isCrit || isFumble) && (
            <div className={cn(
              "absolute -top-2 -right-3 -rotate-12 text-[10px] font-black uppercase px-1.5 py-0.5 rounded",
              isCrit ? "bg-amber-500 text-amber-950" : "bg-red-500 text-red-950"
            )}>
              {isCrit ? "NAT 20!" : "NAT 1!"}
            </div>
          )}
        </div>

        {/* Math breakdown */}
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <span className="text-foreground font-bold">{roll.rolled}</span>
          <span>{roll.modifier >= 0 ? "+" : ""}{roll.modifier}</span>
          <span>=</span>
          <span className={cn(
            "text-lg font-black",
            isSuccess ? "text-emerald-300" : "text-red-300"
          )}>
            {roll.total}
          </span>
          {roll.dc != null && (
            <>
              <span className="text-muted-foreground/50 mx-1">vs</span>
              <span className="text-foreground/80">DC {roll.dc}</span>
            </>
          )}
        </div>

        {/* Result banner */}
        <div className={cn(
          "px-6 py-1.5 rounded-full text-sm font-black uppercase tracking-wider",
          isSuccess
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            : "bg-red-500/20 text-red-300 border border-red-500/30"
        )}>
          {resultLabel}
        </div>
      </div>
    </div>
  );
}
