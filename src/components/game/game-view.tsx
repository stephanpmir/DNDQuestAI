"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import type { ChatMessage as ChatMessageType, DMResponsePayload } from "@/types/game";
import type { WorldEvent } from "@/types/world";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { CharacterSidebar } from "./character-sidebar";
import { DeathScreen } from "./death-screen";

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
    addMessage,
    setLocation,
    addQuest,
    completeQuest,
    incrementTurn,
    setLoading,
    setCampaignStarted,
  } = useGameStore();

  const {
    events,
    npcs,
    locations,
    facts,
    addEvent,
    registerNpc,
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
    updateCompanionApproval,
  } = useKarmaStore();

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
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.narrative,
        }));

        const requestBody = JSON.stringify({
          message,
          character,
          gameState: { location, questLog, turnCount },
          history,
          worldState: { events, npcs, locations, facts },
          karmaData: {
            karma: character.karma,
            history: karmaHistory,
            companions,
          },
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
          });
          if (u.locationChange) {
            setLocation(u.locationChange);
            visitLocation(u.locationChange, turnCount);
          }
          if (u.newQuest) addQuest(u.newQuest);
          if (u.completeQuest) completeQuest(u.completeQuest);
        }

        // Handle death save tracking
        const eo = data.engineOutcome;
        if (eo?.deathSaveResult) {
          updateFromGameState({ deathSaveResult: eo.deathSaveResult });
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

        // Register new NPCs
        if (data.newNpcs) {
          for (const npcName of data.newNpcs) {
            registerNpc(npcName, turnCount, location);
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

        // Add DM message with roll result
        const dmMsg: ChatMessageType = {
          id: generateId(),
          role: "assistant",
          narrative: data.narrative,
          timestamp: Date.now(),
          rollResult: data.engineOutcome?.roll,
        };
        addMessage(dmMsg);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Error calling DM:", errorMessage, err);
        addMessage({
          id: generateId(),
          role: "assistant",
          narrative: "The Dungeon Master pauses briefly... Something went wrong behind the scenes. Please try your action again.",
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
      visitLocation,
      karmaHistory,
      companions,
      addKarmaEvent,
      updateCompanionApproval,
    ]
  );

  const sendToDM = useCallback(
    (message: string) => callDMApi(message, true),
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

  const isDead = character.isDead;

  return (
    <div className="flex h-[100dvh] gap-4 p-4 overflow-hidden">
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
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  DM
                </div>
                <div className="bg-muted rounded-lg px-4 py-3 text-sm animate-pulse">
                  The Dungeon Master is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="pt-3 border-t">
          <ChatInput onSend={sendToDM} disabled={isLoading || isDead} />
        </div>
      </div>
    </div>
  );
}
