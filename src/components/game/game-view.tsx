"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import { useCrimeStore } from "@/stores/crime-store";
import type {
  ChatMessage as ChatMessageType,
  DMResponsePayload,
  GamePhase,
  CombatState,
  LootState,
} from "@/types/game";
import type { WorldEvent } from "@/types/world";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { CharacterSidebar } from "./character-sidebar";
import { DeathScreen } from "./death-screen";
import { SkillCheckCard } from "./skill-check-card";
import { LootModal } from "./loot-modal";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** NPC name patterns — detects "X says", "X speaks", quoted speech from named entity */
const NPC_SPEECH_PATTERNS = [
  /^[""].*[""]$/m,
  /\b[A-Z][a-z]+\s+(?:says?|speaks?|whispers?|shouts?|exclaims?|replies?|asks?|murmurs?|growls?)\b/,
];

/**
 * Detect if the narrative is primarily NPC dialogue.
 * Returns the NPC name if detected, null otherwise.
 */
function detectNpcDialogue(narrative: string, newNpcs?: string[]): string | null {
  // If we have known NPCs mentioned, check if the narrative is dialogue-heavy
  if (newNpcs && newNpcs.length > 0) {
    for (const npc of newNpcs) {
      const speechPattern = new RegExp(
        `\\b${npc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(?:says?|speaks?|whispers?|shouts?|exclaims?|replies?|asks?|murmurs?|growls?)`,
        "i"
      );
      if (speechPattern.test(narrative)) return npc;
    }
  }

  // Check for generic dialogue patterns
  for (const pattern of NPC_SPEECH_PATTERNS) {
    const match = narrative.match(pattern);
    if (match) {
      // Try to extract the NPC name from "Name says/speaks" patterns
      const nameMatch = narrative.match(
        /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:says?|speaks?|whispers?|shouts?|exclaims?|replies?|asks?|murmurs?|growls?)/
      );
      if (nameMatch) return nameMatch[1];
    }
  }

  return null;
}

/**
 * Determine what phase a DM response should trigger.
 */
function determinePhase(
  data: DMResponsePayload,
  currentPhase: GamePhase
): { phase: GamePhase; npcName?: string } {
  const eo = data.engineOutcome;

  // Skill check: any non-attack, non-damage roll
  if (eo?.roll && eo.roll.type !== "attack" && eo.roll.type !== "damage") {
    return { phase: "skill_check" };
  }

  // Combat: attack roll or damage dealt/taken
  if (
    eo?.roll?.type === "attack" ||
    (eo?.damageDealt != null && eo.damageDealt > 0) ||
    (eo?.damageTaken != null && eo.damageTaken > 0)
  ) {
    return { phase: "combat" };
  }

  // Looting: items gained after combat ended
  const hasLoot =
    (data.gameStateUpdate.newItems && data.gameStateUpdate.newItems.length > 0) ||
    (data.gameStateUpdate.goldChange && data.gameStateUpdate.goldChange > 0);
  if (hasLoot && currentPhase === "combat") {
    return { phase: "looting" };
  }

  // Dialogue: detect NPC speech
  const npcName = detectNpcDialogue(data.narrative, data.newNpcs);
  if (npcName) {
    return { phase: "dialogue", npcName };
  }

  // Default: exploration
  return { phase: "exploration" };
}

/**
 * Build combat state from engine outcome for the combat card.
 */
function buildCombatState(
  data: DMResponsePayload,
  characterName: string,
  round: number,
  narrative: string
): CombatState {
  const eo = data.engineOutcome;
  // Extract a short flavor sentence from the full narrative
  const sentences = narrative.split(/(?<=[.!?])\s+/);
  const flavorText = sentences[0]?.slice(0, 120) ?? "";

  // Determine enemy condition based on whether damage was dealt
  let enemyCondition = "ready to fight";
  if (eo?.damageDealt && eo.damageDealt > 10) {
    enemyCondition = "badly wounded";
  } else if (eo?.damageDealt && eo.damageDealt > 5) {
    enemyCondition = "wounded";
  } else if (eo?.damageDealt && eo.damageDealt > 0) {
    enemyCondition = "scratched";
  }

  // Try to determine enemy name from narrative
  const enemyMatch = narrative.match(
    /\b(?:the\s+)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:snarls?|lunges?|attacks?|strikes?|swings?|charges?|hisses?|roars?|growls?)/
  );
  const enemyName = enemyMatch?.[1] ?? "Enemy";

  return {
    round,
    enemyName,
    initiativeOrder: [characterName, enemyName],
    playerAttackRoll: eo?.roll?.type === "attack" ? eo.roll : undefined,
    damageDealt: eo?.damageDealt,
    enemyCondition,
    damageTaken: eo?.damageTaken,
    isCriticalHit: eo?.isCriticalHit,
    flavorText,
  };
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
    gamePhase,
    pendingLoot,
    combatRound,
    addMessage,
    setLocation,
    addQuest,
    completeQuest,
    incrementTurn,
    setLoading,
    setCampaignStarted,
    setGamePhase,
    setPendingLoot,
    incrementCombatRound,
    resetCombatRound,
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
    updateCompanionApproval,
  } = useKarmaStore();

  const {
    crimes,
    addCrime,
    updateEvidence,
    markConfronted,
  } = useCrimeStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const autoStartFired = useRef(false);
  // Ref for pending skill check roll result — stores the roll and narrative
  const pendingSkillCheck = useRef<{
    narrative: string;
    data: DMResponsePayload;
  } | null>(null);

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
          crimes,
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

        // ── Rules reference short-circuit ─────────────────────────────
        // No state changes, no phase transitions — just show the card
        if (data.rulesReference) {
          const rulesMsg: ChatMessageType = {
            id: generateId(),
            role: "assistant",
            narrative: data.narrative,
            timestamp: Date.now(),
            rulesReference: data.rulesReference,
          };
          addMessage(rulesMsg);
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

        // Handle fame changes
        if (data.fameChange) {
          updateFromGameState({ fameChange: data.fameChange });
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
          const matchingCrime = crimes.find(
            (c) => c.type === data.guardConfrontation!.crimeType &&
                   c.location === data.guardConfrontation!.crimeLocation &&
                   !c.confronted
          );
          if (matchingCrime) {
            markConfronted(matchingCrime.id);
          }
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

        // ── Phase detection and transitions ──────────────────────────
        const { phase: newPhase, npcName: detectedNpc } = determinePhase(data, gamePhase);

        if (newPhase === "combat") {
          // Enter or continue combat
          const nextRound = gamePhase === "combat" ? combatRound + 1 : 1;
          if (gamePhase !== "combat") {
            resetCombatRound();
          }
          incrementCombatRound();
          setGamePhase("combat");

          const combatState = buildCombatState(
            data,
            character.name,
            nextRound,
            data.narrative
          );

          const dmMsg: ChatMessageType = {
            id: generateId(),
            role: "assistant",
            narrative: data.narrative,
            timestamp: Date.now(),
            rollResult: data.engineOutcome?.roll,
            karmaChange: data.karmaChange?.amount,
            fameChange: data.fameChange,
            phase: "combat",
            combatState,
          };
          addMessage(dmMsg);

          // Check if combat ends (enemy defeated — player hit and dealt damage)
          // If there's loot, transition to looting
          if (
            eo?.damageDealt &&
            eo.damageDealt > 0 &&
            u?.newItems &&
            u.newItems.length > 0
          ) {
            const loot: LootState = {
              items: u.newItems,
              gold: u.goldChange ?? undefined,
              selectedItems: [],
            };
            setPendingLoot(loot);
            setGamePhase("looting");
            resetCombatRound();
          }
        } else if (newPhase === "skill_check" && data.engineOutcome?.roll) {
          // Transition to skill check — store data, show card, block input
          setGamePhase("skill_check");
          pendingSkillCheck.current = { narrative: data.narrative, data };
          // Don't add the DM message yet — wait for roll to complete
        } else if (newPhase === "looting") {
          setGamePhase("looting");
          const loot: LootState = {
            items: u?.newItems ?? [],
            gold: u?.goldChange ?? undefined,
            selectedItems: [],
          };
          setPendingLoot(loot);
          resetCombatRound();

          // Add a brief DM message
          const dmMsg: ChatMessageType = {
            id: generateId(),
            role: "assistant",
            narrative: data.narrative,
            timestamp: Date.now(),
            karmaChange: data.karmaChange?.amount,
            fameChange: data.fameChange,
            phase: "exploration",
          };
          addMessage(dmMsg);
        } else if (newPhase === "dialogue") {
          setGamePhase("dialogue");
          const dmMsg: ChatMessageType = {
            id: generateId(),
            role: "assistant",
            narrative: data.narrative,
            timestamp: Date.now(),
            rollResult: data.engineOutcome?.roll,
            karmaChange: data.karmaChange?.amount,
            fameChange: data.fameChange,
            phase: "dialogue",
            npcName: detectedNpc ?? undefined,
          };
          addMessage(dmMsg);
        } else {
          // Exploration (default)
          setGamePhase("exploration");
          resetCombatRound();
          const dmMsg: ChatMessageType = {
            id: generateId(),
            role: "assistant",
            narrative: data.narrative,
            timestamp: Date.now(),
            rollResult: data.engineOutcome?.roll,
            karmaChange: data.karmaChange?.amount,
            fameChange: data.fameChange,
            phase: "exploration",
          };
          addMessage(dmMsg);
        }
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
      gamePhase,
      combatRound,
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
      updateCompanionApproval,
      crimes,
      addCrime,
      updateEvidence,
      markConfronted,
      setGamePhase,
      setPendingLoot,
      incrementCombatRound,
      resetCombatRound,
    ]
  );

  const sendToDM = useCallback(
    (message: string) => callDMApi(message, true),
    [callDMApi]
  );

  /** Called when the skill check roll animation completes */
  const handleSkillCheckComplete = useCallback(() => {
    const pending = pendingSkillCheck.current;
    if (!pending) {
      setGamePhase("exploration");
      return;
    }

    // Now add the DM message with the roll result showing the outcome
    const dmMsg: ChatMessageType = {
      id: generateId(),
      role: "assistant",
      narrative: pending.narrative,
      timestamp: Date.now(),
      rollResult: pending.data.engineOutcome?.roll,
      karmaChange: pending.data.karmaChange?.amount,
      fameChange: pending.data.fameChange,
      phase: "exploration",
    };
    addMessage(dmMsg);
    pendingSkillCheck.current = null;
    setGamePhase("exploration");
  }, [addMessage, setGamePhase]);

  /** Called when loot modal is dismissed */
  const handleLootComplete = useCallback(
    (_selectedItems: string[]) => {
      // Items were already applied by the engine — just dismiss modal
      setPendingLoot(null);
      setGamePhase("exploration");
    },
    [setPendingLoot, setGamePhase]
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

  // Get the pending skill check roll for display
  const skillCheckRoll = pendingSkillCheck.current?.data.engineOutcome?.roll;

  return (
    <div className="flex h-[100dvh] gap-4 p-4 overflow-hidden">
      {/* Death screen overlay */}
      {isDead && <DeathScreen />}

      {/* Loot modal overlay */}
      {gamePhase === "looting" && pendingLoot && (
        <LootModal loot={pendingLoot} onComplete={handleLootComplete} />
      )}

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

            {/* Skill check card — shown between messages when in skill_check phase */}
            {gamePhase === "skill_check" && skillCheckRoll && (
              <SkillCheckCard
                roll={skillCheckRoll}
                onRollComplete={handleSkillCheckComplete}
              />
            )}

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
          <ChatInput
            onSend={sendToDM}
            disabled={isLoading || isDead}
            gamePhase={gamePhase}
          />
        </div>
      </div>
    </div>
  );
}
