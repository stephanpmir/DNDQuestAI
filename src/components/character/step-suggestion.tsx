"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BeginnerSurvey, Race, CharacterClass, Gender, AbilityScores } from "@/types/character";
import { RACES, CLASSES } from "@/types/character";
import { RACE_SUMMARIES, CLASS_SUMMARIES } from "@/lib/descriptions";
import type { GeneratedProfile } from "@/app/api/profile/route";
import { useLanguageStore } from "@/stores/language-store";

interface StepSuggestionProps {
  survey: BeginnerSurvey;
  /** Pre-selected race/class from scoring engine (fallback if API fails) */
  fallbackRace: Race;
  fallbackClass: CharacterClass;
  onAccept: (profile: {
    name: string;
    race: Race;
    class: CharacterClass;
    gender: Gender;
    abilityScores: AbilityScores;
    backstory: string;
  }) => void;
  /** Skip suggestion and go to manual creation with pre-selected race/class */
  onSkip: () => void;
  onBack: () => void;
}

type Status = "loading" | "ready" | "error";

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

export function StepSuggestion({
  survey,
  fallbackRace,
  fallbackClass,
  onAccept,
  onSkip,
  onBack,
}: StepSuggestionProps) {
  const t = useLanguageStore((s) => s.t);
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<GeneratedProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProfile = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey,
          suggestedRace: fallbackRace,
          suggestedClass: fallbackClass,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Network error" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setProfile(data.profile);
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate profile");
      setStatus("error");
    }
  }, [survey, fallbackRace, fallbackClass]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleAccept() {
    if (!profile) return;
    onAccept({
      name: profile.name,
      race: profile.race as Race,
      class: profile.class as CharacterClass,
      gender: profile.gender as Gender,
      abilityScores: profile.abilityScores,
      backstory: profile.backstory,
    });
  }

  // ── Loading state ──
  if (status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("suggestion.generating")}</CardTitle>
          <CardDescription className="text-xs">
            {t("suggestion.generatingDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("suggestion.wait")}</p>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs">
            {t("suggestion.skipManual")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Error state ──
  if (status === "error" || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("suggestion.errorTitle")}</CardTitle>
          <CardDescription className="text-xs">
            {errorMsg || t("suggestion.errorDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={fetchProfile} className="w-full">
            {t("suggestion.tryAgain")}
          </Button>
          <Button variant="outline" onClick={onSkip} className="w-full">
            {t("suggestion.chooseManually")}
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full text-xs">
            {t("suggestion.backToSurvey")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Profile ready ──
  const raceValid = RACES.includes(profile.race as Race);
  const classValid = CLASSES.includes(profile.class as CharacterClass);
  const raceSummary = raceValid ? RACE_SUMMARIES[profile.race as Race] : null;
  const classSummary = classValid ? CLASS_SUMMARIES[profile.class as CharacterClass] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("suggestion.meetCharacter")}</CardTitle>
        <CardDescription className="text-xs">
          {t("suggestion.meetDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name & Gender */}
        <div className="text-center">
          <h3 className="text-xl font-bold">{profile.name}</h3>
          <p className="text-xs text-muted-foreground">
            {profile.gender} {profile.race} {profile.class}
          </p>
        </div>

        {/* Race & Class badges */}
        <div className="flex gap-2 justify-center flex-wrap">
          {raceSummary && (
            <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/20">
              {profile.race}
              <span className="text-muted-foreground ml-1">{raceSummary.tagline}</span>
            </span>
          )}
          {classSummary && (
            <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/20">
              {profile.class}
              <span className="text-muted-foreground ml-1">{classSummary.tagline}</span>
            </span>
          )}
        </div>

        {/* Ability Scores */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(profile.abilityScores) as [keyof AbilityScores, number][]).map(
            ([key, val]) => (
              <div
                key={key}
                className="text-center py-2 rounded-lg bg-muted/30 border border-border/20"
              >
                <p className="text-[10px] text-muted-foreground font-medium">
                  {ABILITY_LABELS[key]}
                </p>
                <p className="text-lg font-bold">{val}</p>
              </div>
            )
          )}
        </div>

        {/* Backstory */}
        <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
            {t("suggestion.backstory")}
          </p>
          <p className="text-xs leading-relaxed">{profile.backstory}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={handleAccept} className="w-full">
            {t("suggestion.accept")}
          </Button>
          <Button variant="outline" onClick={onSkip} className="w-full">
            {t("suggestion.modify")}
          </Button>
          <Button variant="ghost" onClick={fetchProfile} className="w-full text-xs">
            {t("suggestion.generateDifferent")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
