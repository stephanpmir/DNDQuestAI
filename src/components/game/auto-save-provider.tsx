"use client";

import { useEffect, useRef } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { useWorldStore } from "@/stores/world-store";
import { useCrimeStore } from "@/stores/crime-store";
import { useSaveStore } from "@/stores/save-store";

/** Debounce interval in ms — avoids saving on every keystroke */
const SAVE_DEBOUNCE_MS = 1500;

/**
 * Invisible component that subscribes to all game stores and records a
 * unified auto-save timestamp whenever meaningful state changes.
 *
 * Must be mounted inside the game page (only saves while a game is active).
 */
export function AutoSaveProvider() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to the specific slices that matter for game state
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
  const recordSave = useSaveStore((s) => s.recordSave);

  useEffect(() => {
    // Don't save if no character has been created yet
    if (!isCreated) return;

    // Debounce: clear any pending save, schedule a new one
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      recordSave({
        characterName: character.name,
        characterLevel: character.level,
        location,
        turnCount,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    // Game-relevant state that should trigger a save
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
    recordSave,
  ]);

  // This component renders nothing
  return null;
}
