"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { GameView } from "@/components/game/game-view";

export default function GamePage() {
  const router = useRouter();
  const isCreated = useCharacterStore((s) => s.isCreated);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist rehydration before acting on isCreated.
  // restoreSnapshot() calls setState synchronously, but on a fresh page
  // load the persist middleware rehydrates from localStorage async.
  useEffect(() => {
    const unsub = useCharacterStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. SPA navigation), check immediately
    if (useCharacterStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !isCreated) {
      router.replace("/character");
    }
  }, [hydrated, isCreated, router]);

  if (!hydrated || !isCreated) return null;

  return <GameView />;
}
