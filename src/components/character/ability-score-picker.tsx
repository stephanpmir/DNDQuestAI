"use client";

import { useState, useCallback } from "react";
import type { AbilityScores } from "@/types/character";
import { Button } from "@/components/ui/button";

const ABILITY_NAMES: (keyof AbilityScores)[] = [
  "strength",
  "dexterity",
  "constitution",
  "wisdom",
  "intelligence",
  "charisma",
];

interface DiceRoll {
  dice: [number, number, number, number];
  droppedIndex: number;
  total: number;
}

function roll4d6DropLowest(): DiceRoll {
  const dice = Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 6) + 1
  ) as [number, number, number, number];
  let minVal = dice[0];
  let minIdx = 0;
  for (let i = 1; i < 4; i++) {
    if (dice[i] < minVal) {
      minVal = dice[i];
      minIdx = i;
    }
  }
  const total = dice.reduce((a, b) => a + b, 0) - minVal;
  return { dice, droppedIndex: minIdx, total };
}

function rollFullSet(): DiceRoll[] {
  return ABILITY_NAMES.map(() => roll4d6DropLowest());
}

function getTotalModifier(rolls: DiceRoll[]): number {
  return rolls.reduce((sum, r) => sum + Math.floor((r.total - 10) / 2), 0);
}

interface Props {
  scores: AbilityScores;
  onChange: (scores: AbilityScores) => void;
}

export function AbilityScorePicker({ onChange }: Props) {
  const [rolls, setRolls] = useState<DiceRoll[]>(() => rollFullSet());
  const [hasRolled, setHasRolled] = useState(false);

  const applyRolls = useCallback(
    (newRolls: DiceRoll[]) => {
      const newScores: AbilityScores = {
        strength: newRolls[0].total,
        dexterity: newRolls[1].total,
        constitution: newRolls[2].total,
        wisdom: newRolls[3].total,
        intelligence: newRolls[4].total,
        charisma: newRolls[5].total,
      };
      onChange(newScores);
    },
    [onChange]
  );

  function handleRollAll() {
    const newRolls = rollFullSet();
    setRolls(newRolls);
    setHasRolled(true);
    applyRolls(newRolls);
  }

  function handleRerollOne(index: number) {
    const newRolls = [...rolls];
    newRolls[index] = roll4d6DropLowest();
    setRolls(newRolls);
    applyRolls(newRolls);
  }

  const totalMod = getTotalModifier(rolls);
  const avgScore = rolls.reduce((s, r) => s + r.total, 0) / 6;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleRollAll} variant="outline">
          {hasRolled ? "Reroll All" : "Roll Dice"}
        </Button>
        {hasRolled && (
          <span className="text-xs text-muted-foreground">
            Avg: {avgScore.toFixed(1)} | Net modifier:{" "}
            {totalMod >= 0 ? "+" : ""}
            {totalMod}
          </span>
        )}
      </div>

      {hasRolled && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {ABILITY_NAMES.map((ability, i) => {
              const roll = rolls[i];
              const mod = Math.floor((roll.total - 10) / 2);
              return (
                <div key={ability} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-sm font-medium">
                      {ability}
                    </span>
                    <span className="text-lg font-bold">
                      {roll.total}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({mod >= 0 ? "+" : ""}
                        {mod})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {roll.dice.map((d, di) => (
                      <span
                        key={di}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono ${
                          di === roll.droppedIndex
                            ? "bg-destructive/20 text-muted-foreground line-through"
                            : "bg-muted"
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs ml-auto"
                      onClick={() => handleRerollOne(i)}
                    >
                      Reroll
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
            <p className="font-medium">How dice rolling works:</p>
            <p>
              Each ability rolls 4d6, dropping the lowest die (crossed out).
              You can reroll any individual ability or all of them.
            </p>
            <p>
              <strong>Luck system:</strong> Characters with lower total scores
              gain luck bonuses from the DM — favorable NPC reactions, lucky
              finds, and merciful encounters. Characters with higher scores
              face tougher enemies and harder challenges.
            </p>
          </div>
        </>
      )}

      {!hasRolled && (
        <p className="text-sm text-muted-foreground">
          Click &quot;Roll Dice&quot; to roll 4d6 (drop lowest) for each
          ability score. You can reroll individual abilities or all of them.
        </p>
      )}
    </div>
  );
}
