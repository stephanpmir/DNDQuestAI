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

interface StepSurveyProps {
  onComplete: (survey: BeginnerSurvey) => void;
  onBack: () => void;
}

interface QuestionDef<K extends keyof BeginnerSurvey> {
  key: K;
  title: string;
  subtitle: string;
  options: { value: BeginnerSurvey[K]; label: string; desc: string }[];
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
    title: "How do you want to solve problems?",
    subtitle: "Pick the approach that sounds most fun to you.",
    options: [
      { value: "fighting", label: "Fight!", desc: "Charge in, swing a weapon, and overpower enemies." },
      { value: "sneaking", label: "Sneak", desc: "Stay in the shadows, pick locks, and strike unseen." },
      { value: "magic", label: "Cast spells", desc: "Harness arcane or divine power to reshape reality." },
      { value: "talking", label: "Talk it out", desc: "Charm, persuade, or intimidate your way through." },
    ],
  },
  {
    key: "teamRole",
    title: "Are you a lone wolf or a team player?",
    subtitle: "This shapes how your character interacts with NPCs.",
    options: [
      { value: "lone-wolf", label: "Lone wolf", desc: "Self-reliant and independent — you work best alone." },
      { value: "team-player", label: "Team player", desc: "You support allies and share the spotlight." },
      { value: "leader", label: "Natural leader", desc: "You take charge and inspire others to follow." },
    ],
  },
  {
    key: "riskStyle",
    title: "How do you handle danger?",
    subtitle: "There's no wrong answer — it's about your play style.",
    options: [
      { value: "cautious", label: "Think first", desc: "Plan carefully, avoid unnecessary fights, stay safe." },
      { value: "balanced", label: "Go with the flow", desc: "Adapt to the situation — fight or flee as needed." },
      { value: "reckless", label: "Dive in!", desc: "Fortune favors the bold — take risks for big rewards." },
    ],
  },
  {
    key: "theme",
    title: "What fantasy flavor appeals to you?",
    subtitle: "This helps us pick a class theme you'll enjoy.",
    options: [
      { value: "martial", label: "Steel & strength", desc: "Swords, armor, and physical prowess." },
      { value: "arcane", label: "Arcane mystery", desc: "Ancient spells, forbidden knowledge, raw power." },
      { value: "holy", label: "Divine purpose", desc: "Faith, healing, and smiting evil." },
      { value: "nature", label: "The wild", desc: "Animals, forests, and primal forces." },
      { value: "shadow", label: "Shadows & cunning", desc: "Stealth, trickery, and dark bargains." },
    ],
  },
  {
    key: "complexity",
    title: "How complex do you want your character?",
    subtitle: "Simpler characters are easier to learn with.",
    options: [
      { value: "simple", label: "Keep it simple", desc: "Fewer decisions in combat — great for beginners." },
      { value: "moderate", label: "A bit of depth", desc: "Some special abilities to manage each turn." },
      { value: "complex", label: "Give me everything", desc: "Lots of spells and options — I like choices!" },
    ],
  },
];

export function StepSurvey({ onComplete, onBack }: StepSurveyProps) {
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
            Question {qi + 1} of {totalQ}
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
        <CardTitle className="text-lg">{question.title}</CardTitle>
        <CardDescription className="text-xs">
          {question.subtitle}
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
            <p className="text-sm font-medium">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.desc}</p>
          </button>
        ))}

        <div className="flex gap-3 pt-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
          {qi < totalQ - 1 && currentAnswer && (
            <Button
              variant="ghost"
              onClick={() => setQi(qi + 1)}
              className="flex-1 text-xs"
            >
              Skip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
