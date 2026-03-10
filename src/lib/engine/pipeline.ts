/**
 * Turn Pipeline — the duplicable pattern.
 *
 * Every player action flows through this exact sequence:
 *
 * 1. INPUT    → Parse player action
 * 2. QUERY    → Retrieve relevant state (facts, events, NPCs)
 * 3. RESOLVE  → Rules engine determines outcome (deterministic)
 * 4. ASSEMBLE → Build optimal context window (anchors + sliding + retrieved)
 * 5. GENERATE → LLM narrates the outcome
 * 6. VALIDATE → Contradiction detector + guardrails
 * 7. UPDATE   → Append facts, register NPCs, update state
 * 8. DELIVER  → Return to player
 *
 * Each step is independently testable. You can unit test the validator
 * without the LLM. You can test the state machine without narration.
 * You can swap LLM providers without changing any game logic.
 */

import type { Character } from "@/types/character";
import type { Fact } from "./fact-ledger";
import type { WorldEvent, NPC, LocationRecord, EngineOutcome } from "@/types/world";
import { resolveAction } from "./rules";
import { checkEscalation } from "./escalation";
import { extractQueryTags, queryFacts, getAnchors, shouldPromoteToAnchor, createFact } from "./fact-ledger";
import { assembleContext, formatContextForPrompt } from "./context-assembler";
import { detectContradictions, buildContradictionHint } from "./contradiction";
import { validateNarrative } from "./guardrails";
import type { AssembledContext } from "./context-assembler";
import type { Contradiction } from "./contradiction";

/** Everything the pipeline needs to process a turn */
export interface PipelineInput {
  playerAction: string;
  character: Character;
  gameState: { location: string; questLog: string[]; turnCount: number };
  /** Chat history for sliding window */
  chatHistory: { role: string; content: string }[];
  /** Full fact ledger */
  facts: Fact[];
  /** World events */
  events: WorldEvent[];
  /** Known NPCs */
  npcs: NPC[];
  /** Known locations */
  locations: LocationRecord[];
  /** Current karma score for rules engine */
  karma?: number;
}

/** The result after steps 1-4 (everything before LLM call) */
export interface PreGenerationResult {
  engineOutcome: EngineOutcome;
  assembledContext: AssembledContext;
  formattedContext: string;
  queryTags: string[];
  /** Facts whose reference count was bumped */
  referencedFactIds: string[];
}

/** The result after steps 5-7 (after LLM call + validation) */
export interface PostGenerationResult {
  narrative: string;
  engineOutcome: EngineOutcome;
  /** New facts to append to the ledger */
  newFacts: Fact[];
  /** Fact IDs whose reference count should be bumped */
  bumpedFactIds: string[];
  /** Fact IDs to promote to anchor */
  promotedAnchors: string[];
  /** New NPCs detected */
  newNpcs: string[];
  /** Contradictions found (empty if clean) */
  contradictions: Contradiction[];
  /** Whether the LLM needs to regenerate */
  needsRegeneration: boolean;
  /** Hint to inject if regenerating */
  regenerationHint: string;
}

// ── STEP 1-4: Pre-generation (no LLM needed) ─────────────────────

export function preGenerate(input: PipelineInput): PreGenerationResult {
  const { playerAction, character, gameState, chatHistory, facts, events, npcs, locations } = input;

  // STEP 1: Parse — extract query tags from player input
  const knownNpcNames = npcs.map((n) => n.name);
  const knownLocationNames = locations.map((l) => l.name);
  const queryTags = extractQueryTags(playerAction, knownNpcNames, knownLocationNames);

  // Also add current location as a tag
  if (gameState.location && !queryTags.includes(gameState.location.toLowerCase())) {
    queryTags.push(gameState.location.toLowerCase());
  }

  // STEP 2: Query — find relevant facts
  const referencedFacts = queryFacts(facts, queryTags);
  const referencedFactIds = referencedFacts.map((f) => f.id);

  // STEP 3: Resolve — deterministic rules engine
  const engineOutcome = resolveAction(playerAction, character, gameState, events, input.karma);

  // Check escalation
  const escalation = checkEscalation(events, gameState.location);
  if (escalation) {
    engineOutcome.escalationHint = escalation;
  }

  // STEP 4: Assemble — build context window
  const currentLocation = locations.find(
    (l) => l.name.toLowerCase() === gameState.location.toLowerCase()
  ) ?? null;

  const assembledContext = assembleContext(
    facts,
    queryTags,
    chatHistory,
    currentLocation,
    gameState.questLog,
    events
  );

  const formattedContext = formatContextForPrompt(assembledContext);

  return {
    engineOutcome,
    assembledContext,
    formattedContext,
    queryTags,
    referencedFactIds,
  };
}

// ── STEP 5-7: Post-generation (after LLM response) ───────────────

export function postGenerate(
  rawNarrative: string,
  input: PipelineInput,
  preResult: PreGenerationResult
): PostGenerationResult {
  const { character, gameState, facts, npcs } = input;
  const { engineOutcome, referencedFactIds } = preResult;

  // STEP 6: Validate — contradiction detection + guardrails
  const contradictions = detectContradictions(rawNarrative, facts, npcs, gameState.location);
  const hardContradictions = contradictions.filter((c) => c.severity === "hard");

  const guardrailResult = validateNarrative(
    rawNarrative,
    character,
    npcs,
    input.events,
    gameState.location
  );

  const needsRegeneration = hardContradictions.length > 0;
  const regenerationHint = needsRegeneration
    ? buildContradictionHint(hardContradictions)
    : "";

  // STEP 7: Update — generate new facts from this turn
  const newFacts: Fact[] = [];
  const turnId = `t${gameState.turnCount}`;

  // Fact from the action itself
  if (engineOutcome.roll) {
    const rollFact = createFact(
      `${turnId}_roll`,
      gameState.turnCount,
      "event",
      `${character.name} attempted ${engineOutcome.roll.type}${engineOutcome.roll.ability ? ` (${engineOutcome.roll.ability})` : ""}: ${engineOutcome.roll.success ? "succeeded" : "failed"} (rolled ${engineOutcome.roll.total} vs DC ${engineOutcome.roll.dc})`,
      [gameState.location.toLowerCase(), character.name.toLowerCase()]
    );
    newFacts.push(rollFact);
  }

  // Facts from state changes
  if (engineOutcome.locationChange) {
    newFacts.push(createFact(
      `${turnId}_loc`,
      gameState.turnCount,
      "location",
      `${character.name} traveled to ${engineOutcome.locationChange}`,
      [engineOutcome.locationChange.toLowerCase()]
    ));
  }

  if (engineOutcome.newQuest) {
    newFacts.push(createFact(
      `${turnId}_quest`,
      gameState.turnCount,
      "quest",
      `New quest: ${engineOutcome.newQuest}`,
      ["quest", engineOutcome.newQuest.toLowerCase()],
      { isQuestCritical: true }
    ));
  }

  if (engineOutcome.completeQuest) {
    newFacts.push(createFact(
      `${turnId}_quest_done`,
      gameState.turnCount,
      "quest",
      `Quest completed: ${engineOutcome.completeQuest}`,
      ["quest", engineOutcome.completeQuest.toLowerCase()]
    ));
  }

  if (engineOutcome.hpChange < 0 && character.hp + engineOutcome.hpChange <= 0) {
    newFacts.push(createFact(
      `${turnId}_unconscious`,
      gameState.turnCount,
      "event",
      `${character.name} fell unconscious`,
      [character.name.toLowerCase()],
      { isAnchor: true }
    ));
  }

  // Karma-related facts
  if (engineOutcome.karmaChange) {
    const karmaDir = engineOutcome.karmaChange.amount > 0 ? "good" : "evil";
    newFacts.push(createFact(
      `${turnId}_karma`,
      gameState.turnCount,
      "event",
      `${character.name} performed a ${karmaDir} act: ${engineOutcome.karmaChange.type}`,
      [character.name.toLowerCase(), "karma"]
    ));
  }

  if (engineOutcome.divineEffect) {
    newFacts.push(createFact(
      `${turnId}_divine`,
      gameState.turnCount,
      "event",
      `Divine intervention: ${engineOutcome.divineEffect.description}`,
      [character.name.toLowerCase(), "divine"],
      { isAnchor: true }
    ));
  }

  // Register new NPCs as facts
  for (const npcName of guardrailResult.newNpcs) {
    newFacts.push(createFact(
      `${turnId}_npc_${npcName}`,
      gameState.turnCount,
      "npc",
      `Met ${npcName} at ${gameState.location}`,
      [npcName.toLowerCase(), gameState.location.toLowerCase()]
    ));
  }

  // Check for anchor promotions
  const currentAnchorCount = getAnchors(facts).length;
  const promotedAnchors: string[] = [];
  for (const factId of referencedFactIds) {
    const fact = facts.find((f) => f.id === factId);
    if (fact && shouldPromoteToAnchor(
      { ...fact, referenceCount: fact.referenceCount + 1 },
      currentAnchorCount + promotedAnchors.length
    )) {
      promotedAnchors.push(factId);
    }
  }

  return {
    narrative: guardrailResult.narrative,
    engineOutcome,
    newFacts,
    bumpedFactIds: referencedFactIds,
    promotedAnchors,
    newNpcs: guardrailResult.newNpcs,
    contradictions,
    needsRegeneration,
    regenerationHint,
  };
}
