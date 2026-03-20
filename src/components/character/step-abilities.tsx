"use client";

import { useState, useCallback } from "react";
import type { AbilityScores, Race } from "@/types/character";
import { RACIAL_DATA } from "@/lib/races";
import { ABILITY_DESCRIPTIONS } from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";

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
  const t = useLanguageStore((s) => s.t);
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
    <div
      className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(201,162,39,0.15)" }}
    >
      <div className="px-6 pt-6 pb-3">
        <h2
          className="text-xl font-cinzel font-bold tracking-wide flex items-center gap-1"
          style={{
            background: "linear-gradient(180deg, #f0d060, #c9a227)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("abilities.title")}
          <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
            <InfoTip text={t("abilities.tip")} />
          </span>
        </h2>
        <p className="text-sm text-[#8a8a8a] mt-1">
          {t("abilities.description")}
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <Button
          type="button"
          onClick={handleRollAll}
          disabled={!canFullReroll}
          className={
            hasRolled
              ? "w-full bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent border disabled:opacity-40"
              : "w-full bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
          }
        >
          {hasRolled
            ? `${t("abilities.rerollAll")} (${MAX_FULL_REROLLS - fullRerollsUsed} ${t("abilities.left")})`
            : t("abilities.rollDice")}
        </Button>

        {hasRolled && (
          <>
            <div className="text-[10px] text-[#c9a227] text-center font-cinzel tracking-wide">
              {t("abilities.individualRemaining")}: {MAX_INDIVIDUAL_REROLLS - individualRerollsUsed}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ABILITY_NAMES.map((ability, i) => {
                const roll = rolls[i];
                const desc = ABILITY_DESCRIPTIONS[ability];
                const racialBonus = getRacialBonus(ability);
                const finalScore = roll.total + racialBonus;
                const mod = Math.floor((finalScore - 10) / 2);
                return (
                  <div key={ability} className="border border-[#2a2a2a] bg-[#0f0f0f] rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-[#c9a227] uppercase tracking-wider font-cinzel">
                          {ABILITY_LABELS[ability]}
                        </span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium capitalize text-white">{ability}</span>
                          <InfoTip text={desc.long} />
                        </div>
                        <p className="text-[10px] text-[#8a8a8a]">{desc.short}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-lg font-bold"
                          style={{
                            background: "linear-gradient(180deg, #f0d060, #c9a227)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          {finalScore}
                        </span>
                        <span className="text-xs text-[#8a8a8a] ml-1">
                          ({mod >= 0 ? "+" : ""}{mod})
                        </span>
                        {racialBonus > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            +{racialBonus} {t("abilities.from")} {race}
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
                              ? "bg-[#1a0000] text-[#555] line-through border border-[#6b0000]/50"
                              : "bg-[#1a1a1a] border border-[#333] text-white"
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs ml-auto text-[#c9a227] hover:text-white hover:bg-[#6b0000]/30"
                        onClick={() => handleRerollOne(i)}
                        disabled={!canIndividualReroll}
                      >
                        {t("abilities.reroll")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
          >
            {t("common.back")}
          </Button>
          <Button
            onClick={onNext}
            disabled={!hasRolled}
            className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide disabled:opacity-40 transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
          >
            {t("abilities.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
