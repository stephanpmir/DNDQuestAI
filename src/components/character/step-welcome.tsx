"use client";

import { Button } from "@/components/ui/button";

interface StepWelcomeProps {
  onNext: () => void;
  onQuickStart: () => void;
  onSurvey: () => void;
}

export function StepWelcome({ onNext, onQuickStart, onSurvey }: StepWelcomeProps) {
  return (
    <div
      className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(201,162,39,0.15)" }}
    >
      <div className="text-center px-6 pt-6 pb-4">
        <h2
          className="text-2xl font-cinzel font-bold tracking-wide"
          style={{
            background: "linear-gradient(180deg, #f0d060, #c9a227)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome, Adventurer!
        </h2>
        <p className="text-sm text-[#8a8a8a] max-w-md mx-auto mt-2">
          You&apos;re about to create a character for a solo D&amp;D adventure
          with an AI Dungeon Master. Don&apos;t worry if you&apos;re new —
          we&apos;ll walk you through each step.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#2a2a2a] text-sm space-y-2">
          <p className="font-medium text-[#c9a227] font-cinzel text-xs tracking-wide">Here&apos;s what we&apos;ll set up:</p>
          <ol className="list-decimal list-inside space-y-1 text-[#8a8a8a] text-xs">
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
            className="w-full bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
            onClick={onNext}
          >
            Create My Character
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent font-cinzel tracking-wide"
            onClick={onSurvey}
          >
            I&apos;m New — Help Me Choose
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-gray-500 hover:text-gray-300 hover:bg-white/5 font-cinzel tracking-wide"
            onClick={onQuickStart}
          >
            Quick Start — Surprise Me!
          </Button>
          <p className="text-[11px] text-[#8a8a8a] text-center">
            &quot;Help Me Choose&quot; asks a few quick questions to suggest a
            character. Quick Start generates one randomly.
          </p>
        </div>
      </div>
    </div>
  );
}
