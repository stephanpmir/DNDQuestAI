"use client";

import type { CharacterClass, Race } from "@/types/character";
import { CLASS_DATA, FIGHTING_STYLES } from "@/lib/classes";
import {
  SKILL_DESCRIPTIONS,
  CANTRIP_DESCRIPTIONS,
  SPELL_DESCRIPTIONS,
  FIGHTING_STYLE_DESCRIPTIONS,
} from "@/lib/descriptions";
import { InfoTip } from "./info-tip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepSkillsProps {
  characterClass: CharacterClass;
  race: Race;
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

/** All D&D 5e skills for Half-Elf Skill Versatility bonus choices */
const ALL_SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];

/** Shared gold gradient for section headers */
const goldGradientStyle = {
  background: "linear-gradient(180deg, #f0d060, #c9a227)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as const;

/** Shared card wrapper style */
const cardShadow = "0 0 20px rgba(201,162,39,0.15)";

export function StepSkills({
  characterClass,
  race,
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

  const halfElfBonus = race === "Half-Elf" ? 2 : 0;
  const totalSkillChoices = classData.skillChoiceCount + halfElfBonus;
  const availableSkills = race === "Half-Elf"
    ? [...new Set([...classData.skillChoices, ...ALL_SKILLS])]
    : classData.skillChoices;

  const skillsValid = selectedSkills.length === totalSkillChoices;
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
      <div
        className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
        style={{ boxShadow: cardShadow }}
      >
        <div className="px-6 pt-5 pb-2">
          <h3
            className="text-base font-cinzel font-bold tracking-wide flex items-center gap-1"
            style={goldGradientStyle}
          >
            Skill Proficiencies
            <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
              <InfoTip text="Skills represent what your character is trained in. Being proficient in a skill means you add a bonus when attempting related actions." />
            </span>
          </h3>
          <p className="text-sm text-[#8a8a8a] mt-1">
            Choose {totalSkillChoices} skills.
            {selectedSkills.length < totalSkillChoices && (
              <span className="text-[#c9a227] ml-1">
                ({totalSkillChoices - selectedSkills.length} remaining)
              </span>
            )}
          </p>
        </div>
        <div className="px-6 pb-5">
          <div className="grid grid-cols-1 gap-1.5">
            {availableSkills.map((skill) => {
              const selected = selectedSkills.includes(skill);
              const disabled =
                !selected && selectedSkills.length >= totalSkillChoices;
              const desc = SKILL_DESCRIPTIONS[skill];
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onToggleSkill(skill)}
                  disabled={disabled}
                  className={cn(
                    "text-left px-3 py-2 rounded border transition-all",
                    selected
                      ? "bg-[#1a0000] border-[#c9a227]"
                      : disabled
                        ? "bg-[#0a0a0a] border-[#1a1a1a] text-[#555] cursor-not-allowed"
                        : "bg-[#111] border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#c9a227] cursor-pointer"
                  )}
                  style={selected ? { boxShadow: "0 0 12px rgba(201,162,39,0.3)" } : undefined}
                >
                  <div className="flex items-center gap-1">
                    <span className={cn("text-xs", selected ? "font-semibold text-[#c9a227]" : "text-white")}>
                      {selected ? "\u25C9 " : "\u25CB "}{skill}
                    </span>
                  </div>
                  {desc && (
                    <p className="text-[10px] text-[#8a8a8a] mt-0.5 ml-4">
                      {desc}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fighting Style */}
      {fightingStyles.length > 0 && (
        <div
          className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
          style={{ boxShadow: cardShadow }}
        >
          <div className="px-6 pt-5 pb-2">
            <h3
              className="text-base font-cinzel font-bold tracking-wide flex items-center gap-1"
              style={goldGradientStyle}
            >
              Fighting Style
              <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
                <InfoTip text="Your preferred way of fighting. This gives you a permanent bonus based on your combat preference." />
              </span>
            </h3>
            <p className="text-sm text-[#8a8a8a] mt-1">Choose your combat specialization.</p>
          </div>
          <div className="px-6 pb-5">
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
                      "w-full text-left px-3 py-2 rounded border transition-all cursor-pointer",
                      selected
                        ? "bg-[#1a0000] border-[#c9a227]"
                        : "bg-[#111] border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-[#c9a227]"
                    )}
                    style={selected ? { boxShadow: "0 0 12px rgba(201,162,39,0.3)" } : undefined}
                  >
                    <span className={cn("text-xs", selected ? "font-semibold text-[#c9a227]" : "text-white")}>
                      {selected ? "\u25C9 " : "\u25CB "}{style}
                    </span>
                    {desc && (
                      <p className="text-[10px] text-[#8a8a8a] mt-0.5 ml-4">{desc}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cantrips */}
      {classData.cantripsKnown > 0 && (
        <div
          className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
          style={{ boxShadow: cardShadow }}
        >
          <div className="px-6 pt-5 pb-2">
            <h3
              className="text-base font-cinzel font-bold tracking-wide flex items-center gap-1"
              style={goldGradientStyle}
            >
              Cantrips
              <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
                <InfoTip text="Cantrips are minor spells you can cast anytime without using a spell slot. Think of them as your magical basics." />
              </span>
            </h3>
            <p className="text-sm text-[#8a8a8a] mt-1">
              Choose {classData.cantripsKnown} cantrips.
              {selectedCantrips.length < classData.cantripsKnown && (
                <span className="text-[#c9a227] ml-1">
                  ({classData.cantripsKnown - selectedCantrips.length} remaining)
                </span>
              )}
            </p>
          </div>
          <div className="px-6 pb-5">
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
                      "text-left px-3 py-2 rounded border transition-all",
                      selected
                        ? "bg-purple-950/40 border-purple-500/50"
                        : disabled
                          ? "bg-[#0a0a0a] border-[#1a1a1a] text-[#555] cursor-not-allowed"
                          : "bg-[#111] border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-purple-500/40 cursor-pointer"
                    )}
                    style={selected ? { boxShadow: "0 0 12px rgba(168,85,247,0.2)" } : undefined}
                  >
                    <span className={cn("text-xs", selected ? "font-semibold text-purple-300" : "text-white")}>
                      {selected ? "\u25C9 " : "\u25CB "}{cantrip}
                    </span>
                    {desc && (
                      <p className="text-[10px] text-[#8a8a8a] mt-0.5 ml-4">{desc}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spells */}
      {classData.spellsKnown > 0 && (
        <div
          className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
          style={{ boxShadow: cardShadow }}
        >
          <div className="px-6 pt-5 pb-2">
            <h3
              className="text-base font-cinzel font-bold tracking-wide flex items-center gap-1"
              style={goldGradientStyle}
            >
              1st-Level Spells
              <span style={{ WebkitTextFillColor: "initial", background: "none" }}>
                <InfoTip text="These are more powerful spells that use spell slots. You can only cast them a limited number of times before resting." />
              </span>
            </h3>
            <p className="text-sm text-[#8a8a8a] mt-1">
              Choose {classData.spellsKnown} spells.
              {selectedSpells.length < classData.spellsKnown && (
                <span className="text-[#c9a227] ml-1">
                  ({classData.spellsKnown - selectedSpells.length} remaining)
                </span>
              )}
            </p>
          </div>
          <div className="px-6 pb-5">
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
                      "text-left px-3 py-2 rounded border transition-all",
                      selected
                        ? "bg-blue-950/40 border-blue-500/50"
                        : disabled
                          ? "bg-[#0a0a0a] border-[#1a1a1a] text-[#555] cursor-not-allowed"
                          : "bg-[#111] border-[#2a2a2a] hover:bg-[#1a1a1a] hover:border-blue-500/40 cursor-pointer"
                    )}
                    style={selected ? { boxShadow: "0 0 12px rgba(59,130,246,0.2)" } : undefined}
                  >
                    <span className={cn("text-xs", selected ? "font-semibold text-blue-300" : "text-white")}>
                      {selected ? "\u25C9 " : "\u25CB "}{spell}
                    </span>
                    {desc && (
                      <p className="text-[10px] text-[#8a8a8a] mt-0.5 ml-4">{desc}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
        >
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide disabled:opacity-40 transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
        >
          Next — Review Character
        </Button>
      </div>
    </div>
  );
}
