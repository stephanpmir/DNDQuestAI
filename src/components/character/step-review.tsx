"use client";

import type { Character, AbilityScores } from "@/types/character";
import { RACIAL_DATA } from "@/lib/races";
import { CLASS_DATA } from "@/lib/classes";
import { RACE_SUMMARIES, CLASS_SUMMARIES } from "@/lib/descriptions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  wisdom: "WIS",
  intelligence: "INT",
  charisma: "CHA",
};

interface StepReviewProps {
  character: Character;
  selectedSkills: string[];
  selectedCantrips: string[];
  selectedSpells: string[];
  selectedFightingStyle: string;
  onBack: () => void;
  onSubmit: () => void;
}

export function StepReview({
  character,
  selectedSkills,
  selectedCantrips,
  selectedSpells,
  selectedFightingStyle,
  onBack,
  onSubmit,
}: StepReviewProps) {
  const raceData = RACIAL_DATA[character.race];
  const classData = CLASS_DATA[character.class];
  const raceSummary = RACE_SUMMARIES[character.race];
  const classSummary = CLASS_SUMMARIES[character.class];

  function getRacialBonus(ability: string): number {
    let bonus = raceData.abilityBonuses[ability] ?? 0;
    if (character.halfElfBonuses?.includes(ability)) bonus += 1;
    return bonus;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {character.name} the {character.race} {character.class}
        </CardTitle>
        <CardDescription>
          Review your character before starting the adventure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 border border-border/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Race</p>
            <p className="text-sm font-semibold">{character.race}</p>
            <p className="text-[10px] text-muted-foreground">{raceSummary.tagline}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Class</p>
            <p className="text-sm font-semibold">{character.class}</p>
            <p className="text-[10px] text-muted-foreground">{classSummary.tagline}</p>
          </div>
        </div>

        {/* Ability Scores */}
        <div>
          <p className="text-xs font-medium mb-2">Ability Scores</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ABILITY_LABELS) as (keyof AbilityScores)[]).map((ability) => {
              const base = character.abilityScores[ability];
              const racial = getRacialBonus(ability);
              const total = base + racial;
              const mod = Math.floor((total - 10) / 2);
              return (
                <div key={ability} className="bg-muted/30 rounded p-2 text-center border border-border/20">
                  <p className="text-[10px] text-muted-foreground">{ABILITY_LABELS[ability]}</p>
                  <p className="text-lg font-bold">
                    {total}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({mod >= 0 ? "+" : ""}{mod})
                    </span>
                  </p>
                  {racial > 0 && (
                    <p className="text-[9px] text-emerald-400">+{racial} racial</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Skills */}
        <div>
          <p className="text-xs font-medium mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {selectedSkills.map((skill) => (
              <span key={skill} className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Fighting Style */}
        {selectedFightingStyle && (
          <div>
            <p className="text-xs font-medium mb-1">Fighting Style</p>
            <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/20">
              {selectedFightingStyle}
            </span>
          </div>
        )}

        {/* Cantrips */}
        {selectedCantrips.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Cantrips</p>
            <div className="flex flex-wrap gap-1">
              {selectedCantrips.map((c) => (
                <span key={c} className="text-[10px] bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spells */}
        {selectedSpells.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Spells</p>
            <div className="flex flex-wrap gap-1">
              {selectedSpells.map((s) => (
                <span key={s} className="text-[10px] bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Class Features & Racial Traits */}
        <div>
          <p className="text-xs font-medium mb-1">Features & Traits</p>
          <div className="flex flex-wrap gap-1">
            {classData.features.map((f) => (
              <span key={f} className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/20">{f}</span>
            ))}
            {raceData.traits.map((t) => (
              <span key={t} className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/20">{t}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={onSubmit} size="lg" className="flex-1">
            Begin Adventure!
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
