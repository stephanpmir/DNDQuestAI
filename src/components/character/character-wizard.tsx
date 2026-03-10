"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import type { CharacterClass, Race } from "@/types/character";
import { RACES, CLASSES, HAIR_STYLES, HAIR_COLORS, SKIN_TONES, BODY_BUILDS, HEIGHT_OPTIONS } from "@/types/character";
import { CLASS_DATA, FIGHTING_STYLES } from "@/lib/classes";
import { generateRandomName } from "@/lib/descriptions";
import { Progress } from "@/components/ui/progress";
import { StepWelcome } from "./step-welcome";
import { StepIdentity } from "./step-identity";
import { StepRace } from "./step-race";
import { StepClass } from "./step-class";
import { StepAbilities } from "./step-abilities";
import { StepSkills } from "./step-skills";
import { StepReview } from "./step-review";
import { StepSurvey } from "./step-survey";
import { CharacterAvatar } from "./character-avatar";
import { recommend } from "@/lib/survey-recommend";

const STEP_LABELS = [
  "Welcome",
  "Identity",
  "Race",
  "Class",
  "Abilities",
  "Skills",
  "Review",
];

/** Pick a random element from an array */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N random elements from an array */
function pickRandomN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function CharacterWizard() {
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
    setAvatar,
    setBeginnerSurvey,
    finalizeCharacter,
  } = useCharacterStore();
  const resetGame = useGameStore((s) => s.reset);
  const resetWorld = useWorldStore((s) => s.reset);
  const resetKarma = useKarmaStore((s) => s.reset);

  const [step, setStep] = useState(0);
  const [showSurvey, setShowSurvey] = useState(false);

  // Local UI state for selections
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
  const [selectedFightingStyle, setSelectedFightingStyle] = useState("");
  const [halfElfBonus1, setHalfElfBonus1] = useState("");
  const [halfElfBonus2, setHalfElfBonus2] = useState("");

  const classData = CLASS_DATA[character.class as CharacterClass];

  const handleClassChange = useCallback(
    (cls: CharacterClass) => {
      setClass(cls);
      setSelectedSkills([]);
      setSelectedCantrips([]);
      setSelectedSpells([]);
      setSelectedFightingStyle("");
    },
    [setClass]
  );

  const handleRaceChange = useCallback(
    (race: Race) => {
      setRace(race);
      setHalfElfBonus1("");
      setHalfElfBonus2("");
    },
    [setRace]
  );

  const toggleSkill = useCallback(
    (skill: string) => {
      setSelectedSkills((prev) => {
        if (prev.includes(skill)) return prev.filter((s) => s !== skill);
        if (prev.length >= classData.skillChoiceCount) return prev;
        return [...prev, skill];
      });
    },
    [classData.skillChoiceCount]
  );

  const toggleCantrip = useCallback(
    (cantrip: string) => {
      setSelectedCantrips((prev) => {
        if (prev.includes(cantrip)) return prev.filter((c) => c !== cantrip);
        if (prev.length >= classData.cantripsKnown) return prev;
        return [...prev, cantrip];
      });
    },
    [classData.cantripsKnown]
  );

  const toggleSpell = useCallback(
    (spell: string) => {
      setSelectedSpells((prev) => {
        if (prev.includes(spell)) return prev.filter((s) => s !== spell);
        if (prev.length >= classData.spellsKnown) return prev;
        return [...prev, spell];
      });
    },
    [classData.spellsKnown]
  );

  function handleSubmit() {
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

    setTimeout(() => {
      finalizeCharacter();
      router.push("/game");
    }, 0);
  }

  function handleQuickStart() {
    // Random name
    setName(generateRandomName());

    // Random gender
    const gender = pickRandom(["Male", "Female"] as const);
    setGender(gender);

    // Random race
    const race = pickRandom(RACES);
    setRace(race);

    // Random class
    const cls = pickRandom(CLASSES);
    setClass(cls);

    // Random ability scores (roll 4d6 drop lowest x6)
    function roll4d6(): number {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => a - b);
      return dice[1] + dice[2] + dice[3];
    }
    setAbilityScores({
      strength: roll4d6(),
      dexterity: roll4d6(),
      constitution: roll4d6(),
      wisdom: roll4d6(),
      intelligence: roll4d6(),
      charisma: roll4d6(),
    });

    // Random skills
    const cData = CLASS_DATA[cls];
    const skills = pickRandomN(cData.skillChoices, cData.skillChoiceCount);
    setSkillProficiencies(skills);

    // Random cantrips/spells
    if (cData.cantripsKnown > 0) {
      setCantrips(pickRandomN(cData.cantrips, cData.cantripsKnown));
    }
    if (cData.spellsKnown > 0) {
      setSpells(pickRandomN(cData.spells, cData.spellsKnown));
    }

    // Random fighting style
    const styles = FIGHTING_STYLES[cls] ?? [];
    if (styles.length > 0) {
      setFightingStyle(pickRandom(styles));
    }

    // Half-Elf bonuses
    if (race === "Half-Elf") {
      const choices = ["strength", "dexterity", "constitution", "intelligence", "wisdom"];
      const picked = pickRandomN(choices, 2);
      setHalfElfBonuses([picked[0], picked[1]]);
    }

    // Random avatar customization
    setAvatar({
      hairStyle: pickRandom(HAIR_STYLES),
      hairColor: pickRandom(HAIR_COLORS).value,
      skinTone: pickRandom(SKIN_TONES).value,
      bodyBuild: pickRandom(BODY_BUILDS),
      height: pickRandom(HEIGHT_OPTIONS),
    });

    resetGame();
    resetWorld();
    resetKarma();

    setTimeout(() => {
      finalizeCharacter();
      router.push("/game");
    }, 0);
  }

  const progress = Math.round((step / (STEP_LABELS.length - 1)) * 100);

  const showAvatar = step >= 1 || showSurvey;

  return (
    <div className="flex justify-center gap-8 max-w-4xl mx-auto">
      {/* Main wizard column */}
      <div className="space-y-4 w-full max-w-lg">
        {/* Progress bar */}
        {step > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Step {step} of {STEP_LABELS.length - 1}</span>
              <span>{STEP_LABELS[step]}</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Steps */}
        {step === 0 && !showSurvey && (
          <StepWelcome
            onNext={() => setStep(1)}
            onQuickStart={handleQuickStart}
            onSurvey={() => setShowSurvey(true)}
          />
        )}
        {step === 0 && showSurvey && (
          <StepSurvey
            onComplete={(survey) => {
              setBeginnerSurvey(survey);
              const rec = recommend(survey);
              setRace(rec.race);
              setClass(rec.characterClass);
              setShowSurvey(false);
              setStep(1);
            }}
            onBack={() => setShowSurvey(false)}
          />
        )}
        {step === 1 && (
          <StepIdentity
            name={character.name}
            gender={character.gender}
            onNameChange={setName}
            onGenderChange={setGender}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepRace
            selectedRace={character.race}
            halfElfBonus1={halfElfBonus1}
            halfElfBonus2={halfElfBonus2}
            onRaceChange={handleRaceChange}
            onHalfElfBonus1Change={setHalfElfBonus1}
            onHalfElfBonus2Change={setHalfElfBonus2}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepClass
            selectedClass={character.class}
            onClassChange={handleClassChange}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepAbilities
            scores={character.abilityScores}
            race={character.race}
            halfElfBonuses={
              character.race === "Half-Elf"
                ? [halfElfBonus1, halfElfBonus2].filter(Boolean)
                : []
            }
            onChange={setAbilityScores}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <StepSkills
            characterClass={character.class}
            selectedSkills={selectedSkills}
            selectedCantrips={selectedCantrips}
            selectedSpells={selectedSpells}
            selectedFightingStyle={selectedFightingStyle}
            onToggleSkill={toggleSkill}
            onToggleCantrip={toggleCantrip}
            onToggleSpell={toggleSpell}
            onFightingStyleChange={setSelectedFightingStyle}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        )}
        {step === 6 && (
          <StepReview
            character={character}
            selectedSkills={selectedSkills}
            selectedCantrips={selectedCantrips}
            selectedSpells={selectedSpells}
            selectedFightingStyle={selectedFightingStyle}
            onBack={() => setStep(5)}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {/* Avatar panel — sticky on the right, hidden on small screens */}
      {showAvatar && (
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <CharacterAvatar
              name={character.name}
              race={character.race}
              characterClass={character.class}
              gender={character.gender}
              avatar={character.avatar}
              onAvatarChange={setAvatar}
            />
          </div>
        </div>
      )}
    </div>
  );
}
