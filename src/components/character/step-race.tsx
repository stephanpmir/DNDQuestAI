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
import { useLanguageStore } from "@/stores/language-store";

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
  const t = useLanguageStore((s) => s.t);
  const halfElfValid =
    selectedRace !== "Half-Elf" ||
    (halfElfBonus1 !== "" &&
      halfElfBonus2 !== "" &&
      halfElfBonus1 !== halfElfBonus2);

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
          {t("race.title")}
          <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
            <InfoTip text={t("race.tip")} />
          </span>
        </h2>
        <p className="text-sm text-[#8a8a8a] mt-1">
          {t("race.description")}
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
                    ? "bg-[#1a0000] border-[#c9a227]"
                    : "bg-[#111] border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#c9a227]"
                )}
                style={selected ? { boxShadow: "0 0 12px rgba(201,162,39,0.3)" } : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-cinzel font-semibold", selected ? "text-white" : "text-white")}>{race}</span>
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
                      {data.traits.map((trait) => (
                        <span
                          key={trait}
                          className="text-[10px] bg-[#1a1a1a] text-[#c9a227] px-2 py-0.5 rounded-full border border-[#c9a227]"
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
          <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a] space-y-2">
            <p className="text-xs font-medium text-[#c9a227] font-cinzel">
              {t("race.halfElfTitle")}
              <InfoTip text={t("race.halfElfTip")} />
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-[#8a8a8a]">{t("race.firstBonus")}</Label>
                <Select
                  value={halfElfBonus1}
                  onValueChange={(v) => v && onHalfElfBonus1Change(v)}
                >
                  <SelectTrigger className="bg-[#0f0f0f] border-[#333] text-white focus:border-[#c9a227]">
                    <SelectValue placeholder={t("race.choose")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#c9a227]">
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
                <Label className="text-xs text-[#8a8a8a]">{t("race.secondBonus")}</Label>
                <Select
                  value={halfElfBonus2}
                  onValueChange={(v) => v && onHalfElfBonus2Change(v)}
                >
                  <SelectTrigger className="bg-[#0f0f0f] border-[#333] text-white focus:border-[#c9a227]">
                    <SelectValue placeholder={t("race.choose")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#c9a227]">
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
            className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
          >
            {t("common.back")}
          </Button>
          <Button
            onClick={onNext}
            disabled={!halfElfValid}
            className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide disabled:opacity-40 transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
          >
            {t("race.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
