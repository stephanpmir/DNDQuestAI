"use client";

import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { useHighScoreStore, type HighScoreEntry } from "@/stores/highscore-store";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/stores/language-store";

export function DeathScreen() {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const { character, reset: resetCharacter } = useCharacterStore();
  const { turnCount, reset: resetGame } = useGameStore();
  const resetKarma = useKarmaStore((s) => s.reset);
  const { addScore, getTopScores } = useHighScoreStore();
  const scoreRecorded = useRef(false);

  // Record high score once on mount
  useEffect(() => {
    if (scoreRecorded.current) return;
    scoreRecorded.current = true;

    const entry: HighScoreEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: character.name,
      race: character.race,
      class: character.class,
      level: character.level,
      xp: character.xp,
      gold: character.gold,
      turns: turnCount,
      causeOfDeath: "Failed 3 death saving throws",
      timestamp: Date.now(),
    };
    addScore(entry);
  }, [character, turnCount, addScore]);

  const topScores = getTopScores(5);

  const handleNewGame = () => {
    resetCharacter();
    resetGame();
    resetKarma();
    router.push("/character");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 text-center space-y-6">
        {/* Death header */}
        <div className="space-y-2">
          <div className="text-6xl font-black text-red-500 tracking-wider animate-pulse">
            {t("death.title")}
          </div>
          <div className="text-lg text-red-300/70">
            {character.name} — {character.race} {character.class} — {t("death.hasFallen")}
          </div>
          <div className="text-sm text-muted-foreground italic">
            {t("death.description")}
          </div>
        </div>

        {/* Final stats */}
        <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 space-y-2">
          <div className="text-xs text-red-400/70 uppercase tracking-wider font-semibold">{t("death.finalRecord")}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">{t("death.level")}</div>
            <div className="font-bold text-foreground">{character.level}</div>
            <div className="text-muted-foreground">{t("death.xpEarned")}</div>
            <div className="font-bold text-foreground">{character.xp}</div>
            <div className="text-muted-foreground">{t("death.goldCollected")}</div>
            <div className="font-bold text-amber-400">{character.gold}</div>
            <div className="text-muted-foreground">{t("death.turnsSurvived")}</div>
            <div className="font-bold text-foreground">{turnCount}</div>
          </div>
        </div>

        {/* High scores */}
        {topScores.length > 0 && (
          <div className="bg-muted/20 border border-border/30 rounded-lg p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("death.hallOfFallen")}</div>
            <div className="space-y-1">
              {topScores.map((score, i) => (
                <div key={score.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold w-5">#{i + 1}</span>
                    <span className="text-foreground">
                      {score.name} <span className="text-muted-foreground">Lv{score.level} {score.class}</span>
                    </span>
                  </div>
                  <span className="text-muted-foreground">{score.turns} {t("death.turns")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New game button */}
        <Button
          onClick={handleNewGame}
          variant="outline"
          className="border-red-700 text-red-300 hover:bg-red-950/50 hover:text-red-200"
        >
          {t("death.newAdventure")}
        </Button>
      </div>
    </div>
  );
}
