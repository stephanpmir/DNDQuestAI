"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { GameView } from "@/components/game/game-view";

export default function GamePage() {
  const router = useRouter();
  const isCreated = useCharacterStore((s) => s.isCreated);

  useEffect(() => {
    if (!isCreated) {
      router.replace("/character");
    }
  }, [isCreated, router]);

  if (!isCreated) return null;

  return <GameView />;
}
