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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendToDM = useCallback(
    async (userMessage: string) => {
      setLoading(true);

      // Add user message
      const userMsg: ChatMessageType = {
        id: generateId(),
        role: "user",
        narrative: userMessage,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      incrementTurn();

      try {
        // Build history for context (last 20 messages)
        const history = [...messages, userMsg].slice(-20).map((m) => ({
          role: m.role,
          content: m.narrative,
        }));

        const res = await fetch("/api/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            character,
            gameState: { location, questLog, turnCount },
            history: history.slice(0, -1), // exclude the user msg we already send as `message`
          }),
        });

        if (!res.ok) {
          throw new Error(`DM API returned ${res.status}`);
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
        console.error("Error calling DM:", err);
        addMessage({
          id: generateId(),
          role: "assistant",
          narrative:
            "*(The Dungeon Master seems momentarily distracted... Please try again.)*",
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

  // Start campaign on first load
  useEffect(() => {
    if (!campaignStarted && character.name) {
      setCampaignStarted(true);
      sendToDM(
        `I am ${character.name}, a ${character.race} ${character.class}. Begin my adventure! Set the scene and give me my first quest.`
      );
    }
  }, [campaignStarted, character.name, character.race, character.class, setCampaignStarted, sendToDM]);

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
