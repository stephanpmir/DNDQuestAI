"use client";

import { useState } from "react";
import type { RollResult } from "@/types/world";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  roll: RollResult;
  onRollComplete: () => void;
}

export function SkillCheckCard({ roll, onRollComplete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [animating, setAnimating] = useState(false);

  const displayReason =
    roll.reason ??
    (roll.type === "save"
      ? "Saving throw"
      : roll.ability
        ? `${roll.ability.charAt(0).toUpperCase() + roll.ability.slice(1)} check`
        : "Ability check");

  function handleRoll() {
    setAnimating(true);
    // Brief animation delay before revealing result
    setTimeout(() => {
      setAnimating(false);
      setRevealed(true);
      // Auto-transition after showing result
      setTimeout(onRollComplete, 1500);
    }, 800);
  }

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-amber-700/50 bg-amber-950/20 p-5 space-y-4 text-center">
      <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
        Skill Check Required
      </span>

      <p className="text-sm text-foreground font-medium">{displayReason}</p>

      {roll.dc != null && (
        <p className="text-xs text-muted-foreground">
          DC {roll.dc} — {roll.ability ?? "ability"} check
        </p>
      )}

      {!revealed ? (
        <Button
          onClick={handleRoll}
          disabled={animating}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white"
        >
          {animating ? "Rolling..." : "Roll D20"}
        </Button>
      ) : (
        <div className="space-y-2">
          <div
            className={cn(
              "text-2xl font-black font-mono",
              roll.success ? "text-emerald-400" : "text-red-400"
            )}
          >
            {roll.rolled}
            {roll.modifier >= 0 ? "+" : ""}
            {roll.modifier} = {roll.total}
          </div>
          <div
            className={cn(
              "text-sm font-bold uppercase",
              roll.success ? "text-emerald-400" : "text-red-400"
            )}
          >
            {roll.success ? "SUCCESS" : "FAILURE"}
            {roll.rolled === 20 && " — NAT 20!"}
            {roll.rolled === 1 && " — NAT 1!"}
          </div>
        </div>
      )}
    </div>
  );
}
