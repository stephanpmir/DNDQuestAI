"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import type { CharacterClass, Race, Gender, AbilityScores, BeginnerSurvey, AppearanceFields } from "@/types/character";
import { RACES, CLASSES, HAIR_STYLES, HAIR_COLORS, SKIN_TONES, BODY_BUILDS, HEIGHT_OPTIONS, createDefaultAppearanceFields } from "@/types/character";
import { CLASS_DATA, FIGHTING_STYLES } from "@/lib/classes";
import { generateRandomName } from "@/lib/descriptions";
import { StepWelcome } from "./step-welcome";
import { StepIdentity } from "./step-identity";
import { StepRace } from "./step-race";
import { StepClass } from "./step-class";
import { StepAbilities } from "./step-abilities";
import { StepSkills } from "./step-skills";
import { StepReview } from "./step-review";
import { StepAppearance } from "./step-appearance";
import { StepSurvey } from "./step-survey";
import { StepSuggestion } from "./step-suggestion";
import { recommend, type SurveyRecommendation } from "@/lib/survey-recommend";
import { PortraitLoading } from "./portrait-loading";

const STEP_LABELS = [
  "Welcome",
  "Identity",
  "Race",
  "Class",
  "Abilities",
  "Skills",
  "Review",
  "Appearance",
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
    setAvatarUrl,
    setAppearanceDescription,
    setBeginnerSurvey,
    finalizeCharacter,
  } = useCharacterStore();
  const resetGame = useGameStore((s) => s.reset);
  const resetWorld = useWorldStore((s) => s.reset);
  const resetKarma = useKarmaStore((s) => s.reset);

  const [step, setStep] = useState(0);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  const [surveyData, setSurveyData] = useState<BeginnerSurvey | null>(null);
  const [surveyRec, setSurveyRec] = useState<SurveyRecommendation | null>(null);
  const [portraitPrompt, setPortraitPrompt] = useState<string | null>(null);

  // Local UI state for selections
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
  const [selectedFightingStyle, setSelectedFightingStyle] = useState("");
  const [halfElfBonus1, setHalfElfBonus1] = useState("");
  const [halfElfBonus2, setHalfElfBonus2] = useState("");
  const [appearanceFields, setAppearanceFields] = useState<AppearanceFields>(createDefaultAppearanceFields());

  const classData = CLASS_DATA[character.class as CharacterClass];

  /** Common finalization: show portrait interstitial instead of navigating immediately */
  function finalizeAndShowPortrait(customPrompt?: string) {
    resetGame();
    resetWorld();
    resetKarma();
    if (customPrompt) setPortraitPrompt(customPrompt);
    setTimeout(() => {
      finalizeCharacter();
      setShowPortrait(true);
    }, 0);
  }

  /** Called when portrait generation completes (or times out) */
  const handlePortraitComplete = useCallback(
    (portraitUrl: string | null) => {
      if (portraitUrl) setAvatarUrl(portraitUrl);
      router.push("/game");
    },
    [router, setAvatarUrl]
  );

  function handleAcceptProfile(profile: {
    name: string;
    race: Race;
    class: CharacterClass;
    gender: Gender;
    abilityScores: AbilityScores;
    backstory: string;
  }) {
    setName(profile.name);
    setGender(profile.gender);
    setRace(profile.race);
    setClass(profile.class);
    setAbilityScores(profile.abilityScores);

    // Auto-pick skills, cantrips, spells, fighting style for the class
    const cData = CLASS_DATA[profile.class];
    const heBonus = profile.race === "Half-Elf" ? 2 : 0;
    const skills = pickRandomN(cData.skillChoices, cData.skillChoiceCount + heBonus);
    setSkillProficiencies(skills);

    if (cData.cantripsKnown > 0) {
      setCantrips(pickRandomN(cData.cantrips, cData.cantripsKnown));
    }
    if (cData.spellsKnown > 0) {
      setSpells(pickRandomN(cData.spells, cData.spellsKnown));
    }

    const styles = FIGHTING_STYLES[profile.class] ?? [];
    if (styles.length > 0) {
      setFightingStyle(pickRandom(styles));
    }

    if (profile.race === "Half-Elf") {
      const choices = ["strength", "dexterity", "constitution", "intelligence", "wisdom"];
      const picked = pickRandomN(choices, 2);
      setHalfElfBonuses([picked[0], picked[1]]);
    }

    // Random avatar
    const avatarData = {
      hairStyle: pickRandom(HAIR_STYLES),
      hairColor: pickRandom(HAIR_COLORS).value,
      skinTone: pickRandom(SKIN_TONES).value,
      bodyBuild: pickRandom(BODY_BUILDS),
      height: pickRandom(HEIGHT_OPTIONS),
    };
    setAvatar(avatarData);

    finalizeAndShowPortrait();
  }

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

  const halfElfSkillBonus = character.race === "Half-Elf" ? 2 : 0;
  const totalSkillSlots = classData.skillChoiceCount + halfElfSkillBonus;

  const toggleSkill = useCallback(
    (skill: string) => {
      setSelectedSkills((prev) => {
        if (prev.includes(skill)) return prev.filter((s) => s !== skill);
        if (prev.length >= totalSkillSlots) return prev;
        return [...prev, skill];
      });
    },
    [totalSkillSlots]
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

  /** Save skill selections and advance to appearance step */
  function handleReviewSubmit() {
    setSkillProficiencies(selectedSkills);
    if (selectedCantrips.length > 0) setCantrips(selectedCantrips);
    if (selectedSpells.length > 0) setSpells(selectedSpells);
    if (selectedFightingStyle) setFightingStyle(selectedFightingStyle);
    if (character.race === "Half-Elf" && halfElfBonus1 && halfElfBonus2) {
      setHalfElfBonuses([halfElfBonus1, halfElfBonus2]);
    }
    setStep(7);
  }

  /** Build a flat description string from structured fields (for fallback / storage) */
  function buildFlatDescription(fields: AppearanceFields): string {
    return Object.values(fields).filter((v) => v.trim()).join(", ");
  }

  /** Generate portrait from player's structured appearance fields via LLM */
  async function handleGeneratePortrait() {
    const flatDesc = buildFlatDescription(appearanceFields);
    setAppearanceDescription(flatDesc);

    try {
      const res = await fetch("/api/portrait-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appearanceFields,
          race: character.race,
          characterClass: character.class,
          gender: character.gender,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        finalizeAndShowPortrait(data.prompt);
        return;
      }
    } catch {
      // Fall through to fallback
    }

    // Fallback: embed the flat description directly
    const fallback = `fantasy portrait, ${character.gender.toLowerCase()} ${character.race.toLowerCase()} ${character.class.toLowerCase()}, ${flatDesc}, D&D character art, detailed painting, dark fantasy style, face visible, upper body, dramatic lighting`;
    finalizeAndShowPortrait(fallback);
  }

  /** Skip description — use generic prompt from race/class/gender */
  function handleSkipAppearance() {
    const genericPrompt = `fantasy portrait, ${character.gender.toLowerCase()} ${character.race.toLowerCase()} ${character.class.toLowerCase()}, D&D character art, detailed painting, dark fantasy style, face visible, upper body, dramatic lighting`;
    finalizeAndShowPortrait(genericPrompt);
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
    const heBonus2 = race === "Half-Elf" ? 2 : 0;
    const skills = pickRandomN(cData.skillChoices, cData.skillChoiceCount + heBonus2);
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
    const avatarData = {
      hairStyle: pickRandom(HAIR_STYLES),
      hairColor: pickRandom(HAIR_COLORS).value,
      skinTone: pickRandom(SKIN_TONES).value,
      bodyBuild: pickRandom(BODY_BUILDS),
      height: pickRandom(HEIGHT_OPTIONS),
    };
    setAvatar(avatarData);

    finalizeAndShowPortrait();
  }

  const progress = Math.round((step / (STEP_LABELS.length - 1)) * 100);

  // Show portrait generation interstitial
  if (showPortrait) {
    return (
      <PortraitLoading
        character={useCharacterStore.getState().character}
        customPrompt={portraitPrompt ?? undefined}
        onComplete={handlePortraitComplete}
      />
    );
  }

  return (
    <div className="w-full max-w-[860px] mx-auto">
      {/* Progress bar — gold on dark track */}
      {step > 0 && (
        <div className="space-y-1.5 mb-6">
          <div className="flex justify-between text-[10px] font-cinzel tracking-wider">
            <span className="text-[#c9a227]">Step {step} of {STEP_LABELS.length - 1}</span>
            <span className="text-[#c9a227]">{STEP_LABELS[step]}</span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #8b6914, #c9a227, #f0d060)",
              }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      {step === 0 && !showSurvey && !showSuggestion && (
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
            setSurveyData(survey);
            setSurveyRec(rec);
            setRace(rec.race);
            setClass(rec.characterClass);
            setShowSurvey(false);
            setShowSuggestion(true);
          }}
          onBack={() => setShowSurvey(false)}
        />
      )}
      {step === 0 && showSuggestion && surveyData && surveyRec && (
        <StepSuggestion
          survey={surveyData}
          fallbackRace={surveyRec.race}
          fallbackClass={surveyRec.characterClass}
          onAccept={(profile) => handleAcceptProfile(profile)}
          onSkip={() => {
            setShowSuggestion(false);
            setStep(1);
          }}
          onBack={() => {
            setShowSuggestion(false);
            setShowSurvey(true);
          }}
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
          race={character.race}
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
          onSubmit={handleReviewSubmit}
        />
      )}
      {step === 7 && (
        <StepAppearance
          fields={appearanceFields}
          onFieldChange={(key, value) =>
            setAppearanceFields((prev) => ({ ...prev, [key]: value }))
          }
          onGenerate={handleGeneratePortrait}
          onSkip={handleSkipAppearance}
          onBack={() => setStep(6)}
        />
      )}
    </div>
  );
}
