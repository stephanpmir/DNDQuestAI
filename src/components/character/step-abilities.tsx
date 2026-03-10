"use client";

import { useState, useCallback } from "react";
import type { AbilityScores, Race } from "@/types/character";
import { RACIAL_DATA } from "@/lib/races";
import { ABILITY_DESCRIPTIONS } from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ABILITY_NAMES: (keyof AbilityScores)[] = [
  "strength", "dexterity", "constitution", "wisdom", "intelligence", "charisma",
];

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR", dexterity: "DEX", constitution: "CON",
  wisdom: "WIS", intelligence: "INT", charisma: "CHA",
};

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
    if (dice[i] < minVal) { minVal = dice[i]; minIdx = i; }
  }
  return { dice, droppedIndex: minIdx, total: dice.reduce((a, b) => a + b, 0) - minVal };
}

function rollFullSet(): DiceRoll[] {
  return ABILITY_NAMES.map(() => roll4d6DropLowest());
}

const MAX_FULL_REROLLS = 1;
const MAX_INDIVIDUAL_REROLLS = 2;

interface StepAbilitiesProps {
  scores: AbilityScores;
  race: Race;
  halfElfBonuses: string[];
  onChange: (scores: AbilityScores) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAbilities({
  race,
  halfElfBonuses,
  onChange,
  onNext,
  onBack,
}: StepAbilitiesProps) {
  const [rolls, setRolls] = useState<DiceRoll[]>(() => rollFullSet());
  const [hasRolled, setHasRolled] = useState(false);
  const [fullRerollsUsed, setFullRerollsUsed] = useState(0);
  const [individualRerollsUsed, setIndividualRerollsUsed] = useState(0);

  const racialBonuses = RACIAL_DATA[race].abilityBonuses;

  const applyRolls = useCallback(
    (newRolls: DiceRoll[]) => {
      const newScores: AbilityScores = {
        strength: newRolls[0].total, dexterity: newRolls[1].total,
        constitution: newRolls[2].total, wisdom: newRolls[3].total,
        intelligence: newRolls[4].total, charisma: newRolls[5].total,
      };
      onChange(newScores);
    },
    [onChange]
  );

  function handleRollAll() {
    const newRolls = rollFullSet();
    setRolls(newRolls);
    if (hasRolled) setFullRerollsUsed((n) => n + 1);
    setHasRolled(true);
    setIndividualRerollsUsed(0);
    applyRolls(newRolls);
  }

  function handleRerollOne(index: number) {
    const newRolls = [...rolls];
    newRolls[index] = roll4d6DropLowest();
    setRolls(newRolls);
    setIndividualRerollsUsed((n) => n + 1);
    applyRolls(newRolls);
  }

  function getRacialBonus(ability: string): number {
    let bonus = racialBonuses?.[ability] ?? 0;
    if (halfElfBonuses?.includes(ability)) bonus += 1;
    return bonus;
  }

  const canFullReroll = !hasRolled || fullRerollsUsed < MAX_FULL_REROLLS;
  const canIndividualReroll = individualRerollsUsed < MAX_INDIVIDUAL_REROLLS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Roll Your Ability Scores
          <InfoTip text="Ability scores are your character's core stats (like Strength and Intelligence). Higher scores make you better at related tasks. We roll 4 dice and drop the lowest for each stat." />
        </CardTitle>
        <CardDescription>
          Click &quot;Roll Dice&quot; to generate your stats. You get 1 full
          reroll and 2 individual rerolls.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          onClick={handleRollAll}
          variant={hasRolled ? "outline" : "default"}
          disabled={!canFullReroll}
          className="w-full"
        >
          {hasRolled
            ? `Reroll All (${MAX_FULL_REROLLS - fullRerollsUsed} left)`
            : "Roll Dice"}
        </Button>

        {hasRolled && (
          <>
            <div className="text-[10px] text-muted-foreground text-center">
              Individual rerolls remaining: {MAX_INDIVIDUAL_REROLLS - individualRerollsUsed}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ABILITY_NAMES.map((ability, i) => {
                const roll = rolls[i];
                const desc = ABILITY_DESCRIPTIONS[ability];
                const racialBonus = getRacialBonus(ability);
                const finalScore = roll.total + racialBonus;
                const mod = Math.floor((finalScore - 10) / 2);
                return (
                  <div key={ability} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {ABILITY_LABELS[ability]}
                        </span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium capitalize">{ability}</span>
                          <InfoTip text={desc.long} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{desc.short}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{finalScore}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({mod >= 0 ? "+" : ""}{mod})
                        </span>
                        {racialBonus > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            +{racialBonus} from {race}
                          </div>
                        )}
                      </div>
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
                        disabled={!canIndividualReroll}
                      >
                        Reroll
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={onNext} disabled={!hasRolled} className="flex-1">
            Next — Choose Skills
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
