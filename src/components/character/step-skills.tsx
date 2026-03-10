"use client";

import type { CharacterClass } from "@/types/character";
import { CLASS_DATA, FIGHTING_STYLES } from "@/lib/classes";
import {
  SKILL_DESCRIPTIONS,
  CANTRIP_DESCRIPTIONS,
  SPELL_DESCRIPTIONS,
  FIGHTING_STYLE_DESCRIPTIONS,
} from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StepSkillsProps {
  characterClass: CharacterClass;
  selectedSkills: string[];
  selectedCantrips: string[];
  selectedSpells: string[];
  selectedFightingStyle: string;
  onToggleSkill: (skill: string) => void;
  onToggleCantrip: (cantrip: string) => void;
  onToggleSpell: (spell: string) => void;
  onFightingStyleChange: (style: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSkills({
  characterClass,
  selectedSkills,
  selectedCantrips,
  selectedSpells,
  selectedFightingStyle,
  onToggleSkill,
  onToggleCantrip,
  onToggleSpell,
  onFightingStyleChange,
  onNext,
  onBack,
}: StepSkillsProps) {
  const classData = CLASS_DATA[characterClass];
  const fightingStyles = FIGHTING_STYLES[characterClass] ?? [];

  const skillsValid = selectedSkills.length === classData.skillChoiceCount;
  const cantripsValid =
    classData.cantripsKnown === 0 ||
    selectedCantrips.length === classData.cantripsKnown;
  const spellsValid =
    classData.spellsKnown === 0 ||
    selectedSpells.length === classData.spellsKnown;
  const fightingStyleValid =
    fightingStyles.length === 0 || selectedFightingStyle !== "";

  const isValid = skillsValid && cantripsValid && spellsValid && fightingStyleValid;

  return (
    <div className="space-y-4">
      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1">
            Skill Proficiencies
            <InfoTip text="Skills represent what your character is trained in. Being proficient in a skill means you add a bonus when attempting related actions." />
          </CardTitle>
          <CardDescription>
            Choose {classData.skillChoiceCount} skills.
            {selectedSkills.length < classData.skillChoiceCount && (
              <span className="text-amber-400 ml-1">
                ({classData.skillChoiceCount - selectedSkills.length} remaining)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-1.5">
            {classData.skillChoices.map((skill) => {
              const selected = selectedSkills.includes(skill);
              const disabled =
                !selected && selectedSkills.length >= classData.skillChoiceCount;
              const desc = SKILL_DESCRIPTIONS[skill];
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onToggleSkill(skill)}
                  disabled={disabled}
                  className={cn(
                    "text-left px-3 py-2 rounded border transition-colors",
                    selected
                      ? "bg-primary/20 border-primary/50"
                      : disabled
                        ? "bg-muted/20 border-border/10 text-muted-foreground/50 cursor-not-allowed"
                        : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className={cn("text-xs", selected && "font-semibold text-primary")}>
                      {selected ? "\u25C9 " : "\u25CB "}{skill}
                    </span>
                  </div>
                  {desc && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                      {desc}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fighting Style */}
      {fightingStyles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1">
              Fighting Style
              <InfoTip text="Your preferred way of fighting. This gives you a permanent bonus based on your combat preference." />
            </CardTitle>
            <CardDescription>Choose your combat specialization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {fightingStyles.map((style) => {
                const selected = selectedFightingStyle === style;
                const desc = FIGHTING_STYLE_DESCRIPTIONS[style];
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onFightingStyleChange(style)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded border transition-colors",
                      selected
                        ? "bg-primary/20 border-primary/50 text-primary font-semibold"
                        : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <span className="text-xs">{selected ? "\u25C9 " : "\u25CB "}{style}</span>
                    {desc && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">{desc}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cantrips */}
      {classData.cantripsKnown > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1">
              Cantrips
              <InfoTip text="Cantrips are minor spells you can cast anytime without using a spell slot. Think of them as your magical basics." />
            </CardTitle>
            <CardDescription>
              Choose {classData.cantripsKnown} cantrips.
              {selectedCantrips.length < classData.cantripsKnown && (
                <span className="text-amber-400 ml-1">
                  ({classData.cantripsKnown - selectedCantrips.length} remaining)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-1.5">
              {classData.cantrips.map((cantrip) => {
                const selected = selectedCantrips.includes(cantrip);
                const disabled =
                  !selected &&
                  selectedCantrips.length >= classData.cantripsKnown;
                const desc = CANTRIP_DESCRIPTIONS[cantrip];
                return (
                  <button
                    key={cantrip}
                    type="button"
                    onClick={() => onToggleCantrip(cantrip)}
                    disabled={disabled}
                    className={cn(
                      "text-left px-3 py-2 rounded border transition-colors",
                      selected
                        ? "bg-purple-500/20 border-purple-500/50"
                        : disabled
                          ? "bg-muted/20 border-border/10 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <span className={cn("text-xs", selected && "font-semibold text-purple-300")}>
                      {selected ? "\u25C9 " : "\u25CB "}{cantrip}
                    </span>
                    {desc && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">{desc}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spells */}
      {classData.spellsKnown > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1">
              1st-Level Spells
              <InfoTip text="These are more powerful spells that use spell slots. You can only cast them a limited number of times before resting." />
            </CardTitle>
            <CardDescription>
              Choose {classData.spellsKnown} spells.
              {selectedSpells.length < classData.spellsKnown && (
                <span className="text-amber-400 ml-1">
                  ({classData.spellsKnown - selectedSpells.length} remaining)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-1.5">
              {classData.spells.map((spell) => {
                const selected = selectedSpells.includes(spell);
                const disabled =
                  !selected && selectedSpells.length >= classData.spellsKnown;
                const desc = SPELL_DESCRIPTIONS[spell];
                return (
                  <button
                    key={spell}
                    type="button"
                    onClick={() => onToggleSpell(spell)}
                    disabled={disabled}
                    className={cn(
                      "text-left px-3 py-2 rounded border transition-colors",
                      selected
                        ? "bg-blue-500/20 border-blue-500/50"
                        : disabled
                          ? "bg-muted/20 border-border/10 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <span className={cn("text-xs", selected && "font-semibold text-blue-300")}>
                      {selected ? "\u25C9 " : "\u25CB "}{spell}
                    </span>
                    {desc && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">{desc}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">
          Next — Review Character
        </Button>
      </div>
    </div>
  );
}
