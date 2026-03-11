"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RACES } from "@/types/character";
import type { Race } from "@/types/character";
import { RACIAL_DATA, HALF_ELF_BONUS_CHOICES } from "@/lib/races";
import { RACE_SUMMARIES } from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { cn } from "@/lib/utils";

interface StepRaceProps {
  selectedRace: Race;
  halfElfBonus1: string;
  halfElfBonus2: string;
  onRaceChange: (race: Race) => void;
  onHalfElfBonus1Change: (v: string) => void;
  onHalfElfBonus2Change: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepRace({
  selectedRace,
  halfElfBonus1,
  halfElfBonus2,
  onRaceChange,
  onHalfElfBonus1Change,
  onHalfElfBonus2Change,
  onNext,
  onBack,
}: StepRaceProps) {
  const halfElfValid =
    selectedRace !== "Half-Elf" ||
    (halfElfBonus1 !== "" &&
      halfElfBonus2 !== "" &&
      halfElfBonus1 !== halfElfBonus2);

  return (
    <div className="rounded-lg border border-[#c9a227]/30 bg-[#1a1a1a] overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <h2
          className="text-xl font-cinzel font-bold tracking-wide flex items-center gap-1"
          style={{
            background: "linear-gradient(180deg, #e0c068, #c9a227, #8b6914)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Choose Your Race
          <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
            <InfoTip text="Your race determines your character's species — like human, elf, or dwarf. Each race gets special abilities and stat bonuses that help in different ways." />
          </span>
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Each race has unique traits and ability bonuses. Tap any race to select it.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {RACES.map((race) => {
            const data = RACIAL_DATA[race];
            const summary = RACE_SUMMARIES[race];
            const selected = selectedRace === race;
            return (
              <button
                key={race}
                type="button"
                onClick={() => onRaceChange(race)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border transition-all",
                  selected
                    ? "bg-[#8b0000]/20 border-[#c9a227]/60 ring-1 ring-[#c9a227]/30"
                    : "bg-[#111]/60 border-[#333]/50 hover:bg-[#1a1a1a] hover:border-[#c9a227]/30 hover:shadow-[0_0_8px_rgba(201,162,39,0.08)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-semibold", selected ? "text-[#e0c068]" : "text-neutral-200")}>{race}</span>
                  <span className="text-[10px] text-neutral-500">
                    {summary.tagline}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {summary.playstyle}
                </p>
                {selected && (
                  <div className="mt-2 pt-2 border-t border-[#c9a227]/15">
                    <p className="text-[11px] text-neutral-400">
                      {data.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.traits.map((trait) => (
                        <span
                          key={trait}
                          className="text-[10px] bg-[#c9a227]/10 text-[#c9a227]/80 px-2 py-0.5 rounded-full border border-[#c9a227]/20"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Half-Elf bonus abilities */}
        {selectedRace === "Half-Elf" && (
          <div className="bg-[#111]/80 rounded-lg p-3 border border-[#c9a227]/20 space-y-2">
            <p className="text-xs font-medium text-[#c9a227]/90 font-cinzel">
              Half-Elf Bonus: Choose two abilities to gain +1
              <InfoTip text="Half-Elves get +2 Charisma automatically, plus +1 to two other abilities of your choice. Pick stats that help your class." />
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">First +1</Label>
                <Select
                  value={halfElfBonus1}
                  onValueChange={(v) => v && onHalfElfBonus1Change(v)}
                >
                  <SelectTrigger className="bg-[#111] border-[#333] text-neutral-200 focus:border-[#c9a227]">
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#c9a227]/30">
                    {HALF_ELF_BONUS_CHOICES.filter(
                      (a) => a !== halfElfBonus2
                    ).map((a) => (
                      <SelectItem key={a} value={a} className="capitalize">
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Second +1</Label>
                <Select
                  value={halfElfBonus2}
                  onValueChange={(v) => v && onHalfElfBonus2Change(v)}
                >
                  <SelectTrigger className="bg-[#111] border-[#333] text-neutral-200 focus:border-[#c9a227]">
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#c9a227]/30">
                    {HALF_ELF_BONUS_CHOICES.filter(
                      (a) => a !== halfElfBonus1
                    ).map((a) => (
                      <SelectItem key={a} value={a} className="capitalize">
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/10 hover:border-[#c9a227]/50"
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!halfElfValid}
            className="flex-1 bg-[#8b0000] hover:bg-[#a50000] text-[#e0c068] border border-[#c9a227]/50 font-cinzel tracking-wide disabled:opacity-40"
          >
            Next — Choose Class
          </Button>
        </div>
      </div>
    </div>
  );
}
