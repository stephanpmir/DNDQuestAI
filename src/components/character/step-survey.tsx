"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BeginnerSurvey } from "@/types/character";
import { useLanguageStore } from "@/stores/language-store";

interface StepSurveyProps {
  onComplete: (survey: BeginnerSurvey) => void;
  onBack: () => void;
}

interface QuestionDef<K extends keyof BeginnerSurvey> {
  key: K;
  titleKey: string;
  subtitleKey: string;
  options: { value: BeginnerSurvey[K]; labelKey: string; descKey: string }[];
}

const QUESTIONS: [
  QuestionDef<"playstyle">,
  QuestionDef<"teamRole">,
  QuestionDef<"riskStyle">,
  QuestionDef<"theme">,
  QuestionDef<"complexity">,
] = [
  {
    key: "playstyle",
    titleKey: "survey.q1Title",
    subtitleKey: "survey.q1Subtitle",
    options: [
      { value: "fighting", labelKey: "survey.q1Fight", descKey: "survey.q1FightDesc" },
      { value: "sneaking", labelKey: "survey.q1Sneak", descKey: "survey.q1SneakDesc" },
      { value: "magic", labelKey: "survey.q1Magic", descKey: "survey.q1MagicDesc" },
      { value: "talking", labelKey: "survey.q1Talk", descKey: "survey.q1TalkDesc" },
    ],
  },
  {
    key: "teamRole",
    titleKey: "survey.q2Title",
    subtitleKey: "survey.q2Subtitle",
    options: [
      { value: "lone-wolf", labelKey: "survey.q2Lone", descKey: "survey.q2LoneDesc" },
      { value: "team-player", labelKey: "survey.q2Team", descKey: "survey.q2TeamDesc" },
      { value: "leader", labelKey: "survey.q2Leader", descKey: "survey.q2LeaderDesc" },
    ],
  },
  {
    key: "riskStyle",
    titleKey: "survey.q3Title",
    subtitleKey: "survey.q3Subtitle",
    options: [
      { value: "cautious", labelKey: "survey.q3Cautious", descKey: "survey.q3CautiousDesc" },
      { value: "balanced", labelKey: "survey.q3Balanced", descKey: "survey.q3BalancedDesc" },
      { value: "reckless", labelKey: "survey.q3Reckless", descKey: "survey.q3RecklessDesc" },
    ],
  },
  {
    key: "theme",
    titleKey: "survey.q4Title",
    subtitleKey: "survey.q4Subtitle",
    options: [
      { value: "martial", labelKey: "survey.q4Martial", descKey: "survey.q4MartialDesc" },
      { value: "arcane", labelKey: "survey.q4Arcane", descKey: "survey.q4ArcaneDesc" },
      { value: "holy", labelKey: "survey.q4Holy", descKey: "survey.q4HolyDesc" },
      { value: "nature", labelKey: "survey.q4Nature", descKey: "survey.q4NatureDesc" },
      { value: "shadow", labelKey: "survey.q4Shadow", descKey: "survey.q4ShadowDesc" },
    ],
  },
  {
    key: "complexity",
    titleKey: "survey.q5Title",
    subtitleKey: "survey.q5Subtitle",
    options: [
      { value: "simple", labelKey: "survey.q5Simple", descKey: "survey.q5SimpleDesc" },
      { value: "moderate", labelKey: "survey.q5Moderate", descKey: "survey.q5ModerateDesc" },
      { value: "complex", labelKey: "survey.q5Complex", descKey: "survey.q5ComplexDesc" },
    ],
  },
];

export function StepSurvey({ onComplete, onBack }: StepSurveyProps) {
  const t = useLanguageStore((s) => s.t);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Partial<BeginnerSurvey>>({});

  const question = QUESTIONS[qi];
  const totalQ = QUESTIONS.length;
  const currentAnswer = answers[question.key];

  function selectAnswer(value: string) {
    const updated = { ...answers, [question.key]: value };
    setAnswers(updated);

    if (qi < totalQ - 1) {
      // Auto-advance after a short beat
      setTimeout(() => setQi(qi + 1), 200);
    } else {
      // All questions answered
      onComplete(updated as BeginnerSurvey);
    }
  }

  function handleBack() {
    if (qi > 0) {
      setQi(qi - 1);
    } else {
      onBack();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            {t("survey.question")} {qi + 1} {t("survey.of")} {totalQ}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalQ }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < qi
                    ? "bg-primary"
                    : i === qi
                      ? "bg-primary/60"
                      : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <CardTitle className="text-lg">{t(question.titleKey)}</CardTitle>
        <CardDescription className="text-xs">
          {t(question.subtitleKey)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectAnswer(opt.value)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${
              currentAnswer === opt.value
                ? "border-primary bg-primary/10"
                : "border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60"
            }`}
          >
            <p className="text-sm font-medium">{t(opt.labelKey)}</p>
            <p className="text-xs text-muted-foreground">{t(opt.descKey)}</p>
          </button>
        ))}

        <div className="flex gap-3 pt-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            {t("common.back")}
          </Button>
          {qi < totalQ - 1 && currentAnswer && (
            <Button
              variant="ghost"
              onClick={() => setQi(qi + 1)}
              className="flex-1 text-xs"
            >
              {t("survey.skip")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
