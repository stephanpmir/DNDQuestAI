"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StepWelcomeProps {
  onNext: () => void;
  onQuickStart: () => void;
}

export function StepWelcome({ onNext, onQuickStart }: StepWelcomeProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome, Adventurer!</CardTitle>
        <CardDescription className="text-sm max-w-md mx-auto">
          You&apos;re about to create a character for a solo D&amp;D adventure
          with an AI Dungeon Master. Don&apos;t worry if you&apos;re new —
          we&apos;ll walk you through each step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 border border-border/30 text-sm space-y-2">
          <p className="font-medium">Here&apos;s what we&apos;ll set up:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
            <li>Your character&apos;s name and identity</li>
            <li>Race — determines special abilities and stat bonuses</li>
            <li>Class — your role in combat and exploration</li>
            <li>Ability scores — your character&apos;s core stats</li>
            <li>Skills and spells — what you&apos;re good at</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={onNext}>
            Create My Character
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onQuickStart}
          >
            Quick Start — Surprise Me!
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Quick Start generates a random character so you can jump right in.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
