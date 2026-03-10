/**
 * Context Assembler — builds the optimal context window for the LLM.
 *
 * Three tiers of information:
 *
 * 1. ANCHORS (always present, ~10-20 facts)
 *    - Player identity (race, class, name)
 *    - Companion relationships
 *    - Dead NPCs
 *    - Destroyed locations
 *    - Main antagonist
 *    - Auto-promoted facts (3+ references or quest-critical)
 *
 * 2. SLIDING WINDOW (recent context)
 *    - Last 5 turns of dialogue
 *    - Current scene description
 *    - Active quest step details
 *
 * 3. RETRIEVED (on-demand, query-based)
 *    - NPC backstories when that NPC is mentioned
 *    - Location descriptions when player asks about a place
 *    - Completed quest summaries when referenced
 *    - Event records when player asks "what happened at X?"
 */

import type { Fact } from "./fact-ledger";
import { getAnchors, queryFacts } from "./fact-ledger";
import type { WorldEvent, NPC, LocationRecord } from "@/types/world";

export interface AssembledContext {
  /** Always-present critical facts */
  anchors: string[];
  /** Recent sliding window */
  slidingWindow: {
    recentDialogue: { role: string; content: string }[];
    currentScene: string;
    activeQuestDetails: string[];
  };
  /** Retrieved facts relevant to the current action */
  retrieved: string[];
  /** Total estimated token count */
  estimatedTokens: number;
}

/** Rough token estimate: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Max tokens we want to spend on context (leaves room for system prompt + generation) */
const MAX_CONTEXT_TOKENS = 2000;
const ANCHOR_BUDGET = 800;
const SLIDING_BUDGET = 600;
const RETRIEVAL_BUDGET = 600;

/**
 * Assemble the optimal context window for the LLM.
 *
 * @param facts - Full fact ledger
 * @param queryTags - Tags extracted from the current player input
 * @param recentMessages - Last N chat messages (sliding window)
 * @param currentLocation - Current location record
 * @param activeQuests - Active quest log
 * @param recentEvents - Recent world events
 */
export function assembleContext(
  facts: Fact[],
  queryTags: string[],
  recentMessages: { role: string; content: string }[],
  currentLocation: LocationRecord | null,
  activeQuests: string[],
  recentEvents: WorldEvent[]
): AssembledContext {
  // ── TIER 1: ANCHORS ──────────────────────────────────────────────
  const anchorFacts = getAnchors(facts);
  const anchors: string[] = [];
  let anchorTokens = 0;

  for (const fact of anchorFacts) {
    const tokens = estimateTokens(fact.content);
    if (anchorTokens + tokens > ANCHOR_BUDGET) break;
    anchors.push(fact.content);
    anchorTokens += tokens;
  }

  // ── TIER 2: SLIDING WINDOW ───────────────────────────────────────
  // Last 5 turns of dialogue
  const recentDialogue = recentMessages.slice(-10); // 5 turns = 10 messages (user+assistant)

  // Current scene
  const currentScene = currentLocation
    ? `Current location: ${currentLocation.name}. ${currentLocation.description}`
    : "Location unknown.";

  // Active quest details
  const activeQuestDetails = activeQuests.slice(0, 5);

  // ── TIER 3: RETRIEVED (query-based) ──────────────────────────────
  const retrieved: string[] = [];
  let retrievalTokens = 0;

  if (queryTags.length > 0) {
    const relevantFacts = queryFacts(facts, queryTags);
    for (const fact of relevantFacts) {
      // Skip if already in anchors
      if (fact.isAnchor) continue;
      const tokens = estimateTokens(fact.content);
      if (retrievalTokens + tokens > RETRIEVAL_BUDGET) break;
      retrieved.push(`[Turn ${fact.turn}, ${fact.category}] ${fact.content}`);
      retrievalTokens += tokens;
    }
  }

  // Also retrieve events at mentioned locations
  for (const tag of queryTags) {
    const locationEvents = recentEvents.filter(
      (e) => e.location.toLowerCase().includes(tag.toLowerCase())
    );
    for (const event of locationEvents.slice(-3)) {
      const line = `[Turn ${event.turn}, ${event.type}] ${event.summary}`;
      const tokens = estimateTokens(line);
      if (retrievalTokens + tokens > RETRIEVAL_BUDGET) break;
      if (!retrieved.includes(line)) {
        retrieved.push(line);
        retrievalTokens += tokens;
      }
    }
  }

  const estimatedTokens = anchorTokens +
    estimateTokens(recentDialogue.map((m) => m.content).join(" ")) +
    estimateTokens(currentScene) +
    estimateTokens(activeQuestDetails.join(" ")) +
    retrievalTokens;

  return {
    anchors,
    slidingWindow: {
      recentDialogue,
      currentScene,
      activeQuestDetails,
    },
    retrieved,
    estimatedTokens,
  };
}

/**
 * Format the assembled context into a string for the LLM prompt.
 */
export function formatContextForPrompt(ctx: AssembledContext): string {
  const parts: string[] = [];

  // Anchors
  if (ctx.anchors.length > 0) {
    parts.push(
      `## Permanent Facts (NEVER contradict these)\n${ctx.anchors.map((a) => `- ${a}`).join("\n")}`
    );
  }

  // Scene
  parts.push(`## Current Scene\n${ctx.slidingWindow.currentScene}`);

  // Active quests
  if (ctx.slidingWindow.activeQuestDetails.length > 0) {
    parts.push(
      `## Active Quests\n${ctx.slidingWindow.activeQuestDetails.map((q) => `- ${q}`).join("\n")}`
    );
  }

  // Retrieved context
  if (ctx.retrieved.length > 0) {
    parts.push(
      `## Relevant History (retrieved for this action)\n${ctx.retrieved.map((r) => `- ${r}`).join("\n")}`
    );
  }

  return parts.join("\n\n");
}
