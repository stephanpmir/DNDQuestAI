"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import type { ChatMessage as ChatMessageType, DMResponsePayload } from "@/types/game";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { CharacterSidebar } from "./character-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoStartFired = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        const history = messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.narrative,
        }));

        const res = await fetch("/api/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            character,
            gameState: { location, questLog, turnCount },
            history,
          }),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          const detail = errorBody?.error ?? `HTTP ${res.status}`;
          throw new Error(detail);
        }

        const data: DMResponsePayload = await res.json();

        // Apply game state updates
        const u = data.gameStateUpdate;
        if (u) {
          updateFromGameState({
            hpChange: u.hpChange,
            newItems: u.newItems,
            removeItems: u.removeItems,
            goldChange: u.goldChange,
            xpGained: u.xpGained,
          });
          if (u.locationChange) setLocation(u.locationChange);
          if (u.newQuest) addQuest(u.newQuest);
          if (u.completeQuest) completeQuest(u.completeQuest);
        }

        // Add DM message
        const dmMsg: ChatMessageType = {
          id: generateId(),
          role: "assistant",
          narrative: data.narrative,
          timestamp: Date.now(),
        };
        addMessage(dmMsg);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Error calling DM:", errorMessage, err);
        addMessage({
          id: generateId(),
          role: "assistant",
          narrative: `**Error:** ${errorMessage}\n\n*Check that CEREBRAS_API_KEY is set in your environment variables and the /api/dm endpoint is deployed correctly.*`,
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
      addMessage,
      incrementTurn,
      setLoading,
      updateFromGameState,
      setLocation,
      addQuest,
      completeQuest,
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
      callDMApi(
        `I am ${character.name}, a ${character.race} ${character.class}. Begin my adventure! Set the scene and give me my first quest.`,
        false
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignStarted, character.name]);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Sidebar */}
      <aside className="hidden md:block w-72 shrink-0">
        <CharacterSidebar />
      </aside>

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
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
          </div>
        </ScrollArea>

        <div className="pt-3 border-t">
          <ChatInput onSend={sendToDM} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
