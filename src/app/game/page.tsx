"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { applyPendingSnapshot } from "@/lib/save-snapshot";
import { GameView } from "@/components/game/game-view";

export default function GamePage() {
  const router = useRouter();
  const isCreated = useCharacterStore((s) => s.isCreated);
  const [ready, setReady] = useState(false);

  // Wait for all stores to hydrate, then apply any pending save snapshot.
  // This prevents the persist middleware from overwriting loaded save data.
  useEffect(() => {
    function checkReady() {
      const charHydrated = useCharacterStore.persist.hasHydrated();
      const gameHydrated = useGameStore.persist.hasHydrated();
      if (charHydrated && gameHydrated) {
        // Apply stashed snapshot (from Continue/Load on landing page)
        applyPendingSnapshot();
        setReady(true);
      }
    }

    checkReady();

    // If not yet hydrated, listen for hydration events
    const unsub1 = useCharacterStore.persist.onFinishHydration(checkReady);
    const unsub2 = useGameStore.persist.onFinishHydration(checkReady);
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (ready && !isCreated) {
      router.replace("/character");
    }
  }, [ready, isCreated, router]);

  if (!ready || !isCreated) return null;

  return <GameView />;
}
