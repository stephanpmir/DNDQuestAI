"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Choose Your Race
          <InfoTip text="Your race determines your character's species — like human, elf, or dwarf. Each race gets special abilities and stat bonuses that help in different ways." />
        </CardTitle>
        <CardDescription>
          Each race has unique traits and ability bonuses. Tap any race to select
          it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    ? "bg-primary/15 border-primary/50 ring-1 ring-primary/30"
                    : "bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{race}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {summary.tagline}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary.playstyle}
                </p>
                {selected && (
                  <div className="mt-2 pt-2 border-t border-border/20">
                    <p className="text-[11px] text-muted-foreground">
                      {data.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.traits.map((trait) => (
                        <span
                          key={trait}
                          className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full border border-border/20"
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
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30 space-y-2">
            <p className="text-xs font-medium">
              Half-Elf Bonus: Choose two abilities to gain +1
              <InfoTip text="Half-Elves get +2 Charisma automatically, plus +1 to two other abilities of your choice. Pick stats that help your class." />
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First +1</Label>
                <Select
                  value={halfElfBonus1}
                  onValueChange={(v) => v && onHalfElfBonus1Change(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label className="text-xs">Second +1</Label>
                <Select
                  value={halfElfBonus2}
                  onValueChange={(v) => v && onHalfElfBonus2Change(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
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
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={onNext} disabled={!halfElfValid} className="flex-1">
            Next — Choose Class
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
