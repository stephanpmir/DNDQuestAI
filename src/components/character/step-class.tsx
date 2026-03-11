"use client";

import { Button } from "@/components/ui/button";
import { CLASSES } from "@/types/character";
import type { CharacterClass } from "@/types/character";
import { CLASS_DATA } from "@/lib/classes";
import { CLASS_SUMMARIES } from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { cn } from "@/lib/utils";

interface StepClassProps {
  selectedClass: CharacterClass;
  onClassChange: (cls: CharacterClass) => void;
  onNext: () => void;
  onBack: () => void;
}

const DIFFICULTY_COLORS = {
  Easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  Medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  Hard: "text-red-400 bg-red-400/10 border-red-400/30",
};

export function StepClass({
  selectedClass,
  onClassChange,
  onNext,
  onBack,
}: StepClassProps) {
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
          Choose Your Class
          <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
            <InfoTip text="Your class is your character's profession and fighting style. It determines what weapons you use, what spells you can cast, and how you approach combat." />
          </span>
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Your class defines your abilities in combat and exploration.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {CLASSES.map((cls) => {
            const data = CLASS_DATA[cls];
            const summary = CLASS_SUMMARIES[cls];
            const selected = selectedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => onClassChange(cls)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border transition-all",
                  selected
                    ? "bg-[#8b0000]/20 border-[#c9a227]/60 ring-1 ring-[#c9a227]/30"
                    : "bg-[#111]/60 border-[#333]/50 hover:bg-[#1a1a1a] hover:border-[#c9a227]/30 hover:shadow-[0_0_8px_rgba(201,162,39,0.08)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", selected ? "text-[#e0c068]" : "text-neutral-200")}>{cls}</span>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                        DIFFICULTY_COLORS[summary.difficulty]
                      )}
                    >
                      {summary.difficulty}
                    </span>
                  </div>
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
                      {data.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-[10px] bg-[#c9a227]/10 text-[#c9a227]/80 px-2 py-0.5 rounded-full border border-[#c9a227]/20"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1.5">
                      Hit Die: d{data.hitDie} &middot; Primary:{" "}
                      {data.primaryAbility} &middot; Saves:{" "}
                      {data.savingThrows.join(", ")}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
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
            onClick={onNext}
            className="flex-1 bg-[#8b0000] hover:bg-[#a50000] text-[#e0c068] border border-[#c9a227]/50 font-cinzel tracking-wide"
          >
            Next — Roll Abilities
          </Button>
        </div>
      </div>
    </div>
  );
}
