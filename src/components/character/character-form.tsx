"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import { GENDERS, RACES, CLASSES } from "@/types/character";
import type { CharacterClass, Race } from "@/types/character";
import { MAX_NAME_LENGTH } from "@/lib/constants";
import { RACIAL_DATA, HALF_ELF_BONUS_CHOICES } from "@/lib/races";
import { CLASS_DATA, FIGHTING_STYLES } from "@/lib/classes";
import { AbilityScorePicker } from "./ability-score-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

export function CharacterForm() {
  const router = useRouter();
  const {
    character,
    setName,
    setGender,
    setRace,
    setClass,
    setAbilityScores,
    setSkillProficiencies,
    setCantrips,
    setSpells,
    setFightingStyle,
    setHalfElfBonuses,
    finalizeCharacter,
  } = useCharacterStore();
  const resetGame = useGameStore((s) => s.reset);
  const resetWorld = useWorldStore((s) => s.reset);
  const resetKarma = useKarmaStore((s) => s.reset);

  // Local UI state for selections
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
  const [selectedFightingStyle, setSelectedFightingStyle] = useState<string>("");
  const [halfElfBonus1, setHalfElfBonus1] = useState<string>("");
  const [halfElfBonus2, setHalfElfBonus2] = useState<string>("");

  const raceData = RACIAL_DATA[character.race as Race];
  const classData = CLASS_DATA[character.class as CharacterClass];
  const fightingStyles = FIGHTING_STYLES[character.class] ?? [];
  const halfElfSkillBonus = character.race === "Half-Elf" ? 2 : 0;
  const totalSkillSlots = classData.skillChoiceCount + halfElfSkillBonus;

  // Reset selections when class/race changes
  const handleClassChange = (cls: string | null) => {
    if (!cls) return;
    setClass(cls as CharacterClass);
    setSelectedSkills([]);
    setSelectedCantrips([]);
    setSelectedSpells([]);
    setSelectedFightingStyle("");
  };

  const handleRaceChange = (race: string | null) => {
    if (!race) return;
    setRace(race as Race);
    setHalfElfBonus1("");
    setHalfElfBonus2("");
  };

  // Toggle a skill selection
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill);
      if (prev.length >= totalSkillSlots) return prev;
      return [...prev, skill];
    });
  };

  const toggleCantrip = (cantrip: string) => {
    setSelectedCantrips((prev) => {
      if (prev.includes(cantrip)) return prev.filter((c) => c !== cantrip);
      if (prev.length >= classData.cantripsKnown) return prev;
      return [...prev, cantrip];
    });
  };

  const toggleSpell = (spell: string) => {
    setSelectedSpells((prev) => {
      if (prev.includes(spell)) return prev.filter((s) => s !== spell);
      if (prev.length >= classData.spellsKnown) return prev;
      return [...prev, spell];
    });
  };

  // Validation
  const nameValid = character.name.trim().length >= 2;
  const skillsValid = selectedSkills.length === totalSkillSlots;
  const cantripsValid = classData.cantripsKnown === 0 || selectedCantrips.length === classData.cantripsKnown;
  const spellsValid = classData.spellsKnown === 0 || selectedSpells.length === classData.spellsKnown;
  const fightingStyleValid = fightingStyles.length === 0 || selectedFightingStyle !== "";
  const halfElfValid = character.race !== "Half-Elf" || (halfElfBonus1 !== "" && halfElfBonus2 !== "" && halfElfBonus1 !== halfElfBonus2);

  const isValid = nameValid && skillsValid && cantripsValid && spellsValid && fightingStyleValid && halfElfValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    // Apply selections to store before finalizing
    setSkillProficiencies(selectedSkills);
    if (selectedCantrips.length > 0) setCantrips(selectedCantrips);
    if (selectedSpells.length > 0) setSpells(selectedSpells);
    if (selectedFightingStyle) setFightingStyle(selectedFightingStyle);
    if (character.race === "Half-Elf" && halfElfBonus1 && halfElfBonus2) {
      setHalfElfBonuses([halfElfBonus1, halfElfBonus2]);
    }

    resetGame();
    resetWorld();
    resetKarma();

    // Use setTimeout to ensure store updates are applied before finalizing
    setTimeout(() => {
      finalizeCharacter();
      router.push("/game");
    }, 0);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      {/* ═══ IDENTITY ═══ */}
      <Card>
        <CardHeader>
          <CardTitle>Create Your Hero</CardTitle>
          <CardDescription>
            Choose a name, race, and class to begin your adventure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Character Name</Label>
            <Input
              id="name"
              value={character.name}
              onChange={(e) =>
                setName(e.target.value.slice(0, MAX_NAME_LENGTH))
              }
              placeholder="Enter a name..."
              autoFocus
            />
          </div>

          {/* Gender / Race / Class — same row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select
                value={character.gender}
                onValueChange={(v) => setGender(v as typeof character.gender)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Race</Label>
              <Select
                value={character.race}
                onValueChange={handleRaceChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Class</Label>
              <Select
                value={character.class}
                onValueChange={handleClassChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Race info */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
            <div className="text-xs font-semibold mb-1">{character.race} Traits</div>
            <div className="text-[11px] text-muted-foreground">{raceData.description}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {raceData.traits.map((trait) => (
                <span key={trait} className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full border border-border/20">{trait}</span>
              ))}
            </div>
          </div>

          {/* Class info */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
            <div className="text-xs font-semibold mb-1">{character.class} Features</div>
            <div className="text-[11px] text-muted-foreground">{classData.description}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {classData.features.map((feat) => (
                <span key={feat} className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full border border-border/20">{feat}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ HALF-ELF BONUS ABILITIES ═══ */}
      {character.race === "Half-Elf" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Half-Elf Bonus Abilities</CardTitle>
            <CardDescription>
              Choose two different abilities to gain +1 (in addition to +2 CHA).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First +1</Label>
                <Select value={halfElfBonus1} onValueChange={(v) => v && setHalfElfBonus1(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {HALF_ELF_BONUS_CHOICES.filter((a) => a !== halfElfBonus2).map((a) => (
                      <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Second +1</Label>
                <Select value={halfElfBonus2} onValueChange={(v) => v && setHalfElfBonus2(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {HALF_ELF_BONUS_CHOICES.filter((a) => a !== halfElfBonus1).map((a) => (
                      <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ ABILITY SCORES ═══ */}
      <Card>
        <CardHeader>
          <CardTitle>Ability Scores</CardTitle>
          <CardDescription>
            Roll 4d6, drop the lowest die for each ability. Racial bonuses from {character.race} will be applied automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AbilityScorePicker
            scores={character.abilityScores}
            onChange={setAbilityScores}
            racialBonuses={raceData.abilityBonuses}
            halfElfBonuses={character.race === "Half-Elf" ? [halfElfBonus1, halfElfBonus2].filter(Boolean) : undefined}
          />
        </CardContent>
      </Card>

      {/* ═══ SKILL PROFICIENCIES ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill Proficiencies</CardTitle>
          <CardDescription>
            Choose {totalSkillSlots} skills from your class list.
            {selectedSkills.length < totalSkillSlots && (
              <span className="text-amber-400 ml-1">
                ({totalSkillSlots - selectedSkills.length} remaining)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-1.5">
            {classData.skillChoices.map((skill) => {
              const selected = selectedSkills.includes(skill);
              const disabled = !selected && selectedSkills.length >= totalSkillSlots;
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  disabled={disabled}
                  className={cn(
                    "text-xs text-left px-3 py-1.5 rounded border transition-colors",
                    selected
                      ? "bg-primary/20 border-primary/50 text-primary font-semibold"
                      : disabled
                        ? "bg-muted/20 border-border/10 text-muted-foreground/50 cursor-not-allowed"
                        : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  {selected ? "\u25C9 " : "\u25CB "}{skill}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ FIGHTING STYLE (Fighter/Paladin/Ranger) ═══ */}
      {fightingStyles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fighting Style</CardTitle>
            <CardDescription>Choose your combat specialization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {fightingStyles.map((style) => {
                const selected = selectedFightingStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSelectedFightingStyle(style)}
                    className={cn(
                      "w-full text-xs text-left px-3 py-2 rounded border transition-colors",
                      selected
                        ? "bg-primary/20 border-primary/50 text-primary font-semibold"
                        : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    {selected ? "\u25C9 " : "\u25CB "}{style}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ CANTRIPS (casters) ═══ */}
      {classData.cantripsKnown > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cantrips</CardTitle>
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
            <div className="grid grid-cols-2 gap-1.5">
              {classData.cantrips.map((cantrip) => {
                const selected = selectedCantrips.includes(cantrip);
                const disabled = !selected && selectedCantrips.length >= classData.cantripsKnown;
                return (
                  <button
                    key={cantrip}
                    type="button"
                    onClick={() => toggleCantrip(cantrip)}
                    disabled={disabled}
                    className={cn(
                      "text-xs text-left px-3 py-1.5 rounded border transition-colors",
                      selected
                        ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-semibold"
                        : disabled
                          ? "bg-muted/20 border-border/10 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    {selected ? "\u25C9 " : "\u25CB "}{cantrip}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ SPELLS (casters) ═══ */}
      {classData.spellsKnown > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1st-Level Spells</CardTitle>
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
            <div className="grid grid-cols-2 gap-1.5">
              {classData.spells.map((spell) => {
                const selected = selectedSpells.includes(spell);
                const disabled = !selected && selectedSpells.length >= classData.spellsKnown;
                return (
                  <button
                    key={spell}
                    type="button"
                    onClick={() => toggleSpell(spell)}
                    disabled={disabled}
                    className={cn(
                      "text-xs text-left px-3 py-1.5 rounded border transition-colors",
                      selected
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold"
                        : disabled
                          ? "bg-muted/20 border-border/10 text-muted-foreground/50 cursor-not-allowed"
                          : "bg-muted/30 border-border/20 hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    {selected ? "\u25C9 " : "\u25CB "}{spell}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={!isValid}>
        Begin Adventure
      </Button>
    </form>
  );
}
