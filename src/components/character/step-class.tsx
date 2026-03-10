"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Choose Your Class
          <InfoTip text="Your class is your character's profession and fighting style. It determines what weapons you use, what spells you can cast, and how you approach combat." />
        </CardTitle>
        <CardDescription>
          Your class defines your abilities in combat and exploration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    ? "bg-primary/15 border-primary/50 ring-1 ring-primary/30"
                    : "bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{cls}</span>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                        DIFFICULTY_COLORS[summary.difficulty]
                      )}
                    >
                      {summary.difficulty}
                    </span>
                  </div>
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
                      {data.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full border border-border/20"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
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
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={onNext} className="flex-1">
            Next — Roll Abilities
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
