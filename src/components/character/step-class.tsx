"use client";

import { Button } from "@/components/ui/button";
import { CLASSES } from "@/types/character";
import type { CharacterClass } from "@/types/character";
import { CLASS_DATA } from "@/lib/classes";
import { CLASS_SUMMARIES } from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores/language-store";

interface StepClassProps {
  selectedClass: CharacterClass;
  onClassChange: (cls: CharacterClass) => void;
  onNext: () => void;
  onBack: () => void;
}

const DIFFICULTY_COLORS = {
  Easy: "text-emerald-400 bg-emerald-950/60 border-emerald-800/50",
  Medium: "text-amber-400 bg-amber-950/60 border-amber-800/50",
  Hard: "text-red-400 bg-red-950/60 border-red-800/50",
};

export function StepClass({
  selectedClass,
  onClassChange,
  onNext,
  onBack,
}: StepClassProps) {
  const t = useLanguageStore((s) => s.t);
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
          {t("class.title")}
          <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
            <InfoTip text={t("class.tip")} />
          </span>
        </h2>
        <p className="text-sm text-[#8a8a8a] mt-1">
          {t("class.description")}
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
                    ? "bg-[#1a0000] border-[#c9a227]"
                    : "bg-[#111] border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#c9a227]"
                )}
                style={selected ? { boxShadow: "0 0 12px rgba(201,162,39,0.3)" } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-cinzel font-semibold text-white")}>{cls}</span>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                        DIFFICULTY_COLORS[summary.difficulty]
                      )}
                    >
                      {summary.difficulty}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#c9a227]">
                    {summary.tagline}
                  </span>
                </div>
                <p className="text-xs text-[#8a8a8a] mt-0.5">
                  {summary.playstyle}
                </p>
                {selected && (
                  <div className="mt-2 pt-2 border-t border-[#c9a227]/20">
                    <p className="text-[11px] text-[#8a8a8a]">
                      {data.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-[10px] bg-[#1a1a1a] text-[#c9a227] px-2 py-0.5 rounded-full border border-[#c9a227]"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#8a8a8a] mt-1.5">
                      {t("class.hitDie")}: d{data.hitDie} &middot; {t("class.primary")}:{" "}
                      {data.primaryAbility} &middot; {t("class.saves")}:{" "}
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
            className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
          >
            {t("common.back")}
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
          >
            {t("class.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
