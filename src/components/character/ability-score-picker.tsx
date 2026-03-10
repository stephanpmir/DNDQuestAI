"use client";

import { STANDARD_ARRAY } from "@/lib/constants";
import type { AbilityScores } from "@/types/character";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ABILITY_NAMES: (keyof AbilityScores)[] = [
  "strength",
  "dexterity",
  "constitution",
  "wisdom",
  "intelligence",
  "charisma",
];

interface Props {
  scores: AbilityScores;
  onChange: (scores: AbilityScores) => void;
}

export function AbilityScorePicker({ scores, onChange }: Props) {
  const usedValues = Object.values(scores);

  function handleChange(ability: keyof AbilityScores, value: number) {
    onChange({ ...scores, [ability]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {ABILITY_NAMES.map((ability) => {
        // Available = standard array values not yet used by OTHER abilities
        const otherUsed = usedValues.filter(
          (v, i) => ABILITY_NAMES[i] !== ability
        );
        const available = STANDARD_ARRAY.filter((v) => {
          const countInArray = STANDARD_ARRAY.filter((a) => a === v).length;
          const countUsed = otherUsed.filter((u) => u === v).length;
          return countUsed < countInArray;
        });

        return (
          <div key={ability} className="space-y-1">
            <Label className="capitalize text-sm">{ability}</Label>
            <Select
              value={String(scores[ability])}
              onValueChange={(v) => handleChange(ability, Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([scores[ability], ...available])]
                  .sort((a, b) => b - a)
                  .map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
