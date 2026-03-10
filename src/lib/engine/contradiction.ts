/**
 * Contradiction Detector
 *
 * Checks LLM narrative output against the fact ledger to find
 * statements that contradict established facts. Runs BEFORE
 * the narrative reaches the player.
 *
 * Categories of contradiction:
 * 1. Dead NPC speaking/acting (fact: "Gruk is dead")
 * 2. Destroyed location accessible (fact: "the bridge was destroyed")
 * 3. Item references that don't exist in inventory
 * 4. NPC disposition mismatch (hostile NPC being friendly without cause)
 * 5. Location mismatch (describing a place the player isn't at)
 */

import type { Fact } from "./fact-ledger";
import type { NPC } from "@/types/world";

export interface Contradiction {
  type: "dead_npc" | "destroyed_location" | "phantom_item" | "disposition_mismatch" | "location_mismatch" | "fact_conflict";
  /** The fact that was contradicted */
  factId: string;
  factContent: string;
  /** What the LLM said that contradicts it */
  narrativeExcerpt: string;
  /** Severity: "hard" must be fixed, "soft" is a warning */
  severity: "hard" | "soft";
}

/**
 * Check a narrative for contradictions against known facts.
 * Returns an array of detected contradictions.
 */
export function detectContradictions(
  narrative: string,
  facts: Fact[],
  knownNpcs: NPC[],
  currentLocation: string
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const lower = narrative.toLowerCase();

  // 1. Dead NPCs acting or speaking
  const deathFacts = facts.filter((f) => f.category === "death" && !f.supersededBy);
  for (const fact of deathFacts) {
    // Extract the dead entity's name from tags
    for (const tag of fact.tags) {
      const namePattern = new RegExp(`\\b${escapeRegex(tag)}\\b\\s+(?:says|replies|asks|offers|greets|attacks|blocks|hands|gives|walks|runs|stands|sits|laughs|smiles|nods)`, "i");
      if (namePattern.test(narrative)) {
        contradictions.push({
          type: "dead_npc",
          factId: fact.id,
          factContent: fact.content,
          narrativeExcerpt: extractContext(narrative, tag),
          severity: "hard",
        });
      }
    }
  }

  // 2. Destroyed locations being accessible
  const destroyedFacts = facts.filter(
    (f) => f.category === "location" && !f.supersededBy &&
    (f.content.toLowerCase().includes("destroyed") ||
     f.content.toLowerCase().includes("collapsed") ||
     f.content.toLowerCase().includes("blocked"))
  );
  for (const fact of destroyedFacts) {
    for (const tag of fact.tags) {
      if (lower.includes(tag.toLowerCase()) &&
          (lower.includes("cross") || lower.includes("enter") || lower.includes("walk through") || lower.includes("arrive at"))) {
        contradictions.push({
          type: "destroyed_location",
          factId: fact.id,
          factContent: fact.content,
          narrativeExcerpt: extractContext(narrative, tag),
          severity: "hard",
        });
      }
    }
  }

  // 3. NPC disposition mismatches (hostile NPC suddenly friendly without transition)
  for (const npc of knownNpcs) {
    if (npc.disposition === "hostile") {
      const nameRegex = new RegExp(`\\b${escapeRegex(npc.name)}\\b`, "i");
      if (nameRegex.test(narrative)) {
        // Check for friendly behavior from hostile NPC
        const friendlyPatterns = /(?:smiles warmly|offers help|hands you|gives you a gift|welcomes you|embraces|friendly)/i;
        const npcSection = extractContext(narrative, npc.name);
        if (friendlyPatterns.test(npcSection)) {
          contradictions.push({
            type: "disposition_mismatch",
            factId: `npc_${npc.name}`,
            factContent: `${npc.name} is hostile toward the player`,
            narrativeExcerpt: npcSection,
            severity: "soft",
          });
        }
      }
    }
  }

  return contradictions;
}

/**
 * Build a re-generation hint from contradictions.
 * Injected into the prompt if we need to re-call the LLM.
 */
export function buildContradictionHint(contradictions: Contradiction[]): string {
  if (contradictions.length === 0) return "";

  const lines = contradictions.map((c) => {
    switch (c.type) {
      case "dead_npc":
        return `CORRECTION: ${c.factContent}. Do NOT show them acting or speaking.`;
      case "destroyed_location":
        return `CORRECTION: ${c.factContent}. This place is not accessible.`;
      case "disposition_mismatch":
        return `CORRECTION: ${c.factContent}. Maintain their hostility unless something changed.`;
      case "location_mismatch":
        return `CORRECTION: The player is at "${c.factContent}", not elsewhere.`;
      default:
        return `CORRECTION: Established fact: "${c.factContent}". Do not contradict this.`;
    }
  });

  return `## FACT CORRECTIONS (you contradicted established facts, fix these):\n${lines.join("\n")}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractContext(narrative: string, keyword: string): string {
  const lower = narrative.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - 40);
  const end = Math.min(narrative.length, idx + keyword.length + 60);
  return narrative.slice(start, end).trim();
}
