"use client";

import { useEffect, useRef } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { useWorldStore } from "@/stores/world-store";
import { useCrimeStore } from "@/stores/crime-store";
import { useSaveStore } from "@/stores/save-store";
import { captureSnapshot } from "@/lib/save-snapshot";

/** Debounce interval in ms — avoids saving on every keystroke */
const SAVE_DEBOUNCE_MS = 1500;

/**
 * Invisible component that subscribes to all game stores and auto-saves
 * to the "auto" slot whenever meaningful state changes.
 */
export function AutoSaveProvider() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const character = useCharacterStore((s) => s.character);
  const isCreated = useCharacterStore((s) => s.isCreated);
  const messages = useGameStore((s) => s.messages);
  const location = useGameStore((s) => s.location);
  const questLog = useGameStore((s) => s.questLog);
  const turnCount = useGameStore((s) => s.turnCount);
  const campaignStarted = useGameStore((s) => s.campaignStarted);
  const karmaHistory = useKarmaStore((s) => s.karmaHistory);
  const companions = useKarmaStore((s) => s.companions);
  const worldEvents = useWorldStore((s) => s.events);
  const crimes = useCrimeStore((s) => s.crimes);
  const saveToSlot = useSaveStore((s) => s.saveToSlot);

  useEffect(() => {
    if (!isCreated) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const snapshot = captureSnapshot();
      saveToSlot("auto", {
        savedAt: new Date().toISOString(),
        characterName: character.name,
        characterLevel: character.level,
        location,
        turnCount,
        snapshot,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isCreated,
    character.hp,
    character.maxHp,
    character.xp,
    character.level,
    character.gold,
    character.inventory,
    character.equipped,
    character.karma,
    character.fame,
    character.name,
    messages.length,
    location,
    questLog,
    turnCount,
    campaignStarted,
    karmaHistory.length,
    companions,
    worldEvents.length,
    crimes.length,
    saveToSlot,
  ]);

  return null;
}
