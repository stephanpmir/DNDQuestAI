"use client";

import { Button } from "@/components/ui/button";

interface StepWelcomeProps {
  onNext: () => void;
  onQuickStart: () => void;
  onSurvey: () => void;
}

export function StepWelcome({ onNext, onQuickStart, onSurvey }: StepWelcomeProps) {
  return (
    <div className="rounded-lg border border-[#c9a227]/30 bg-[#1a1a1a] overflow-hidden">
      <div className="text-center px-6 pt-6 pb-4">
        <h2
          className="text-2xl font-cinzel font-bold tracking-wide"
          style={{
            background: "linear-gradient(180deg, #e0c068, #c9a227, #8b6914)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome, Adventurer!
        </h2>
        <p className="text-sm text-neutral-400 max-w-md mx-auto mt-2">
          You&apos;re about to create a character for a solo D&amp;D adventure
          with an AI Dungeon Master. Don&apos;t worry if you&apos;re new —
          we&apos;ll walk you through each step.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="bg-[#111]/80 rounded-lg p-4 border border-[#c9a227]/10 text-sm space-y-2">
          <p className="font-medium text-[#c9a227]/90 font-cinzel text-xs tracking-wide">Here&apos;s what we&apos;ll set up:</p>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-xs">
            <li>Your character&apos;s name and identity</li>
            <li>Race — determines special abilities and stat bonuses</li>
            <li>Class — your role in combat and exploration</li>
            <li>Ability scores — your character&apos;s core stats</li>
            <li>Skills and spells — what you&apos;re good at</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-[#8b0000] hover:bg-[#a50000] text-[#e0c068] border border-[#c9a227]/50 font-cinzel tracking-wide"
            onClick={onNext}
          >
            Create My Character
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/10 hover:border-[#c9a227]/50 font-cinzel tracking-wide"
            onClick={onSurvey}
          >
            I&apos;m New — Help Me Choose
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-neutral-400 hover:text-[#c9a227] hover:bg-[#c9a227]/5 font-cinzel tracking-wide"
            onClick={onQuickStart}
          >
            Quick Start — Surprise Me!
          </Button>
          <p className="text-[11px] text-neutral-500 text-center">
            &quot;Help Me Choose&quot; asks a few quick questions to suggest a
            character. Quick Start generates one randomly.
          </p>
        </div>
      </div>
    </div>
  );
}
