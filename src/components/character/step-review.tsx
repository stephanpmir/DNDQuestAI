"use client";

import type { Character, AbilityScores } from "@/types/character";
import { RACIAL_DATA } from "@/lib/races";
import { CLASS_DATA } from "@/lib/classes";
import { RACE_SUMMARIES, CLASS_SUMMARIES } from "@/lib/descriptions";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-lg border border-[#c9a227]/30 bg-[#1a1a1a] overflow-hidden">
      <div className="text-center px-6 pt-6 pb-3">
        <h2
          className="text-xl font-cinzel font-bold tracking-wide"
          style={{
            background: "linear-gradient(180deg, #e0c068, #c9a227, #8b6914)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {character.name} the {character.race} {character.class}
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Review your character before starting the adventure.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111]/80 rounded-lg p-3 border border-[#c9a227]/15">
            <p className="text-[10px] text-[#c9a227]/60 uppercase tracking-wider font-cinzel">Race</p>
            <p className="text-sm font-semibold text-[#e0c068]">{character.race}</p>
            <p className="text-[10px] text-neutral-500">{raceSummary.tagline}</p>
          </div>
          <div className="bg-[#111]/80 rounded-lg p-3 border border-[#c9a227]/15">
            <p className="text-[10px] text-[#c9a227]/60 uppercase tracking-wider font-cinzel">Class</p>
            <p className="text-sm font-semibold text-[#e0c068]">{character.class}</p>
            <p className="text-[10px] text-neutral-500">{classSummary.tagline}</p>
          </div>
        </div>

        {/* Ability Scores */}
        <div>
          <p className="text-xs font-medium mb-2 text-[#c9a227]/80 font-cinzel tracking-wide">Ability Scores</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ABILITY_LABELS) as (keyof AbilityScores)[]).map((ability) => {
              const base = character.abilityScores[ability];
              const racial = getRacialBonus(ability);
              const total = base + racial;
              const mod = Math.floor((total - 10) / 2);
              return (
                <div key={ability} className="bg-[#111]/80 rounded p-2 text-center border border-[#c9a227]/15">
                  <p className="text-[10px] text-[#c9a227]/60 font-cinzel">{ABILITY_LABELS[ability]}</p>
                  <p className="text-lg font-bold text-[#e0c068]">
                    {total}
                    <span className="text-xs text-neutral-500 ml-1">
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
          <p className="text-xs font-medium mb-1 text-[#c9a227]/80 font-cinzel tracking-wide">Skills</p>
          <div className="flex flex-wrap gap-1">
            {selectedSkills.map((skill) => (
              <span key={skill} className="text-[10px] bg-[#8b0000]/20 text-[#e0c068] px-2 py-0.5 rounded-full border border-[#c9a227]/30">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Fighting Style */}
        {selectedFightingStyle && (
          <div>
            <p className="text-xs font-medium mb-1 text-[#c9a227]/80 font-cinzel tracking-wide">Fighting Style</p>
            <span className="text-[10px] bg-[#111]/80 text-neutral-300 px-2 py-0.5 rounded-full border border-[#c9a227]/20">
              {selectedFightingStyle}
            </span>
          </div>
        )}

        {/* Cantrips */}
        {selectedCantrips.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1 text-[#c9a227]/80 font-cinzel tracking-wide">Cantrips</p>
            <div className="flex flex-wrap gap-1">
              {selectedCantrips.map((c) => (
                <span key={c} className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spells */}
        {selectedSpells.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1 text-[#c9a227]/80 font-cinzel tracking-wide">Spells</p>
            <div className="flex flex-wrap gap-1">
              {selectedSpells.map((s) => (
                <span key={s} className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Class Features & Racial Traits */}
        <div>
          <p className="text-xs font-medium mb-1 text-[#c9a227]/80 font-cinzel tracking-wide">Features & Traits</p>
          <div className="flex flex-wrap gap-1">
            {classData.features.map((f) => (
              <span key={f} className="text-[10px] bg-[#111]/80 text-neutral-400 px-2 py-0.5 rounded-full border border-[#c9a227]/15">{f}</span>
            ))}
            {raceData.traits.map((t) => (
              <span key={t} className="text-[10px] bg-[#111]/80 text-neutral-400 px-2 py-0.5 rounded-full border border-[#c9a227]/15">{t}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/10 hover:border-[#c9a227]/50"
          >
            Back
          </Button>
          <Button
            onClick={onSubmit}
            size="lg"
            className="flex-1 bg-[#8b0000] hover:bg-[#a50000] text-[#e0c068] border border-[#c9a227]/50 font-cinzel tracking-wide text-base"
          >
            Begin Adventure!
          </Button>
        </div>
      </div>
    </div>
  );
}
