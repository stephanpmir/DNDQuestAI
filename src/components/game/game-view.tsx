"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import { useCrimeStore } from "@/stores/crime-store";
import { useLanguageStore } from "@/stores/language-store";
import type { ChatMessage as ChatMessageType, DMResponsePayload } from "@/types/game";
import type { WorldEvent } from "@/types/world";
import type { CombatState } from "@/lib/combat-engine";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { CharacterSidebar } from "./character-sidebar";
import { DeathScreen } from "./death-screen";
import { AutoSaveProvider } from "./auto-save-provider";
import { AutoSaveIndicator } from "./auto-save-indicator";
import { SaveSlotsModal } from "./save-slots-modal";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function GameView() {
  const { character, updateFromGameState } = useCharacterStore();
  const {
    messages,
    location,
    questLog,
    turnCount,
    isLoading,
    campaignStarted,
    justLoaded,
    loadedChatSummary,
    addMessage,
    setLocation,
    addQuest,
    completeQuest,
    incrementTurn,
    setLoading,
    setCampaignStarted,
    clearJustLoaded,
    groundItems,
    addGroundItems,
    removeGroundItem,
  } = useGameStore();

  const {
    events,
    npcs,
    locations,
    facts,
    addEvent,
    registerNpc,
    updateNpcDisposition,
    visitLocation,
    addFacts,
    bumpFactReferences,
    promoteToAnchor,
    initializeAnchors,
  } = useWorldStore();

  const {
    karmaHistory,
    companions,
    addKarmaEvent,
    addFameEvent,
    updateCompanionApproval,
  } = useKarmaStore();

  const {
    crimes,
    addCrime,
    updateEvidence,
    markConfronted,
  } = useCrimeStore();

  const languagePreference = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoStartFired = useRef(false);

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const callDMApi = useCallback(
    async (message: string, showUserMessage: boolean) => {
      setLoading(true);

      if (showUserMessage) {
        const userMsg: ChatMessageType = {
          id: generateId(),
          role: "user",
          narrative: message,
          timestamp: Date.now(),
        };
        addMessage(userMsg);
      }
      incrementTurn();

      try {
        // Build history, filtering out roll_result cards (invalid LLM role)
        const history = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-10)
          .map((m) => ({
            role: m.role,
            content: m.narrative,
          }));

        const requestBody = JSON.stringify({
          message,
          character,
          gameState: { location, questLog, turnCount },
          history,
          worldState: { events, npcs, locations, facts },
          crimes,
          karmaData: {
            karma: character.karma,
            history: karmaHistory,
            companions,
          },
          languagePreference: languagePreference !== "English" ? languagePreference : undefined,
          groundItems: groundItems.length > 0 ? groundItems : undefined,
          combatState: combatState?.active ? combatState : undefined,
        });

        // Retry logic for transient errors (502, 503, 504)
        let res: Response | null = null;
        const MAX_RETRIES = 2;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          res = await fetch("/api/dm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          });

          if (res.ok || (res.status < 500 && res.status !== 429)) break;
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }

        if (!res || !res.ok) {
          const errorBody = await res?.json().catch(() => null);
          const detail = errorBody?.error ?? `HTTP ${res?.status ?? "unknown"}`;
          throw new Error(detail);
        }

        const data: DMResponsePayload = await res.json();

        // ── Rules answer shortcut — no game state changes ───────────
        if (data.rulesAnswer) {
          addMessage({
            id: generateId(),
            role: "assistant",
            narrative: data.narrative,
            timestamp: Date.now(),
            rulesAnswer: true,
          });
          setLoading(false);
          return;
        }

        // Apply engine-decided game state updates
        const u = data.gameStateUpdate;
        if (u) {
          updateFromGameState({
            hpChange: u.hpChange,
            newItems: u.newItems,
            removeItems: u.removeItems,
            goldChange: u.goldChange,
            xpGained: u.xpGained,
            lastRestTurn: u.lastRestTurn,
            restType: u.restType,
            raging: u.raging,
            lastHealTurn: u.lastHealTurn,
            lastTravelEncounterTurn: u.lastTravelEncounterTurn,
            resourceUpdates: u.resourceUpdates,
          });
          if (u.locationChange) {
            setLocation(u.locationChange);
            visitLocation(u.locationChange, turnCount);
          }
          if (u.newQuest) addQuest(u.newQuest);
          if (u.completeQuest) completeQuest(u.completeQuest);
        }

        // Apply ground item changes (loot drops, pickups)
        if (data.addToGround?.length) {
          addGroundItems(data.addToGround);
        }
        if (data.removeFromGround?.length) {
          for (const item of data.removeFromGround) {
            removeGroundItem(item);
          }
        }
        // Clear ground items when changing location (items stay behind)
        if (u?.locationChange && u.locationChange !== location) {
          useGameStore.getState().clearGroundItems();
        }

        // Handle death save tracking
        const eo = data.engineOutcome;
        if (eo?.deathSaveResult) {
          updateFromGameState({ deathSaveResult: eo.deathSaveResult });
        }

        // Handle equip/identify from engine
        if (eo?.equipItem) {
          useCharacterStore.getState().equipItem(eo.equipItem);
        }
        if (eo?.identifyItem) {
          useCharacterStore.getState().identifyItem(eo.identifyItem);
        }

        // Handle karma changes
        if (data.karmaChange) {
          updateFromGameState({ karmaChange: data.karmaChange.amount });
          addKarmaEvent({
            type: data.karmaChange.type as import("@/lib/karma").KarmaActionType,
            amount: data.karmaChange.amount,
            description: data.karmaChange.description,
            turn: turnCount,
          });
          updateCompanionApproval(data.karmaChange.type);
        }

        // Handle fame changes
        if (data.fameChange) {
          updateFromGameState({ fameChange: data.fameChange });
          addFameEvent({
            amount: data.fameChange,
            reason: data.fameReason ?? (data.fameChange > 0 ? t("game.defaultFameGain") : t("game.defaultFameLoss")),
            category: data.fameCategory ?? (data.fameChange > 0 ? "social" : "crime"),
            turn: turnCount,
          });
        }

        // Handle crime detection
        if (data.crimeDetected) {
          addCrime({
            type: data.crimeDetected.type as import("@/lib/crimes").CrimeType,
            turn: turnCount,
            location: data.crimeDetected.location,
            description: data.crimeDetected.description,
          });
        }

        // Handle guard investigation results
        if (data.guardInvestigation) {
          updateEvidence(
            data.guardInvestigation.crimeId,
            data.guardInvestigation.newEvidenceLevel as import("@/lib/crimes").EvidenceLevel
          );
        }

        // Handle guard confrontation
        if (data.guardConfrontation) {
          // Find the matching crime and mark as confronted
          const matchingCrime = crimes.find(
            (c) => c.type === data.guardConfrontation!.crimeType &&
                   c.location === data.guardConfrontation!.crimeLocation &&
                   !c.confronted
          );
          if (matchingCrime) {
            markConfronted(matchingCrime.id);
          }
        }

        // Update combat state from server response
        if (data.combatState !== undefined) {
          setCombatState(data.combatState?.active ? data.combatState : null);
        }

        // Apply fact ledger updates
        if (data.factUpdates) {
          if (data.factUpdates.newFacts.length > 0) {
            addFacts(data.factUpdates.newFacts);
          }
          if (data.factUpdates.bumpedFactIds.length > 0) {
            bumpFactReferences(data.factUpdates.bumpedFactIds);
          }
          if (data.factUpdates.promotedAnchors.length > 0) {
            promoteToAnchor(data.factUpdates.promotedAnchors);
          }
        }

        // Register new NPCs with fame-based dispositions
        if (data.newNpcs) {
          for (const npcName of data.newNpcs) {
            registerNpc(npcName, turnCount, location);
          }
          // Apply computed dispositions from fame/karma check
          if (data.npcDispositions) {
            for (const npcDisp of data.npcDispositions) {
              updateNpcDisposition(npcDisp.name, npcDisp.disposition, npcDisp.recognized);
            }
          }
        }

        // Log structured event
        const eventType = data.engineOutcome?.roll
          ? data.engineOutcome.roll.type === "attack" ? "combat" : "skill_check"
          : "exploration";
        const worldEvent: WorldEvent = {
          id: generateId(),
          turn: turnCount,
          timestamp: Date.now(),
          type: eventType as WorldEvent["type"],
          location: u?.locationChange ?? location,
          summary: message.slice(0, 100),
          npcs: data.newNpcs ?? [],
          itemChanges: [
            ...(u?.newItems ?? []).map((item) => ({ item, gained: true })),
            ...(u?.removeItems ?? []).map((item) => ({ item, gained: false })),
          ],
          rollResult: data.engineOutcome?.roll,
        };
        addEvent(worldEvent);

        // If this was a check roll, insert a centered roll card before the DM narrative
        const isCheckRoll = /\[CHECK_ROLL:/.test(message);
        if (isCheckRoll && data.engineOutcome?.roll) {
          const roll = data.engineOutcome.roll;
          // Extract check info from the message pattern [CHECK_ROLL:skill|stat|dc]
          const checkMatch = message.match(/\[CHECK_ROLL:([^|]+)\|([^|]+)\|(\d+)\]/);
          const rollCardMsg: ChatMessageType = {
            id: generateId(),
            role: "roll_result",
            narrative: "",
            timestamp: Date.now(),
            rollResult: roll,
            checkRequired: checkMatch
              ? { skill: checkMatch[1], stat: checkMatch[2], dc: parseInt(checkMatch[3], 10), description: "" }
              : undefined,
          };
          addMessage(rollCardMsg);
        }

        // Add DM message with roll result and karma/fame indicators
        const dmMsg: ChatMessageType = {
          id: generateId(),
          role: "assistant",
          narrative: data.narrative,
          timestamp: Date.now(),
          // Don't duplicate roll display when a roll card was already inserted
          rollResult: isCheckRoll ? undefined : data.engineOutcome?.roll,
          karmaChange: data.karmaChange?.amount,
          fameChange: data.fameChange,
          sceneImagePrompt: data.sceneImagePrompt,
          checkRequired: data.checkRequired,
          combatResult: data.combatResult ? {
            ...data.combatResult,
            enemyName: data.combatState?.enemyName,
            enemyHp: data.combatState?.enemyHp ?? (data.combatResult.combatOver ? 0 : undefined),
            enemyMaxHp: data.combatState?.enemyMaxHp,
          } : undefined,
        };
        addMessage(dmMsg);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        addMessage({
          id: generateId(),
          role: "assistant",
          narrative: t("game.errorMessage"),
          timestamp: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    },
    [
      messages,
      character,
      location,
      questLog,
      turnCount,
      events,
      npcs,
      locations,
      facts,
      addMessage,
      incrementTurn,
      setLoading,
      updateFromGameState,
      setLocation,
      addQuest,
      completeQuest,
      addEvent,
      addFacts,
      bumpFactReferences,
      promoteToAnchor,
      registerNpc,
      updateNpcDisposition,
      visitLocation,
      karmaHistory,
      companions,
      addKarmaEvent,
      addFameEvent,
      updateCompanionApproval,
      crimes,
      addCrime,
      updateEvidence,
      markConfronted,
      languagePreference,
      groundItems,
      addGroundItems,
      removeGroundItem,
      combatState,
    ]
  );

  const sendToDM = useCallback(
    (message: string) => callDMApi(message, true),
    [callDMApi]
  );

  /** Send a check roll to the DM without showing a player bubble */
  const sendCheckRoll = useCallback(
    (message: string) => callDMApi(message, false),
    [callDMApi]
  );

  // Auto-start campaign — DM intro fires exactly once
  useEffect(() => {
    if (!campaignStarted && character.name && !autoStartFired.current) {
      autoStartFired.current = true;
      setCampaignStarted(true);
      // Initialize character identity anchors in the fact ledger
      initializeAnchors(character.name, character.race, character.class);
      const pronoun = character.gender === "Female" ? "female" : "male";
      callDMApi(
        `I am ${character.name}, a ${pronoun} ${character.race} ${character.class}. Begin my adventure! Set the scene and give me my first quest.`,
        false
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignStarted, character.name]);

  // Welcome-back recap after loading a saved game
  const loadRecapFired = useRef(false);
  useEffect(() => {
    if (justLoaded && !loadRecapFired.current) {
      loadRecapFired.current = true;
      clearJustLoaded();

      const summary = loadedChatSummary ?? "";
      const recapPrompt = [
        `[SYSTEM: The player has returned to a saved game. Welcome them back in character as the Dungeon Master.`,
        `Provide a brief, atmospheric recap of where they are, what they were doing, and what happened recently.`,
        `Then ask what they want to do next. Keep the recap to 2-3 short paragraphs.]`,
        ``,
        `Session context:`,
        summary,
      ].join("\n");

      callDMApi(recapPrompt, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justLoaded]);

  const isDead = character.isDead;
  const [saveModalMode, setSaveModalMode] = useState<"save" | "load" | null>(null);

  return (
    <div className="flex h-[100dvh] gap-4 p-4 overflow-hidden">
      {/* Auto-save listener (renders nothing) */}
      <AutoSaveProvider />

      {/* Save/Load modal */}
      {saveModalMode && (
        <SaveSlotsModal
          mode={saveModalMode}
          open
          onClose={() => setSaveModalMode(null)}
        />
      )}

      {/* Death screen overlay */}
      {isDead && <DeathScreen />}

      {/* Sidebar */}
      <aside className="hidden md:block w-72 shrink-0">
        <CharacterSidebar />
      </aside>

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                avatarUrl={character.avatarUrl}
                onSendMessage={sendToDM}
                onCheckRoll={sendCheckRoll}
                disabled={isLoading}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {t("chat.dm")}
                </div>
                <div className="bg-muted rounded-lg px-4 py-3 text-sm animate-pulse">
                  {t("game.dmThinking")}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-1">
            <AutoSaveIndicator />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSaveModalMode("save")}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                {t("game.saveGame")}
              </button>
              <button
                onClick={() => setSaveModalMode("load")}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                {t("game.loadGame")}
              </button>
            </div>
          </div>
          <ChatInput onSend={sendToDM} disabled={isLoading || isDead} />
        </div>
      </div>
    </div>
  );
}
