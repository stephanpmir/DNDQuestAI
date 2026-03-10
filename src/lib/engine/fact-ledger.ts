/**
 * Fact Ledger — append-only source of truth.
 *
 * Every fact in the game world lives here. The LLM reads from this;
 * it never writes to it directly. Only the engine + guardrails write.
 *
 * Facts are categorized by type and importance. "Anchors" are the
 * 10-20 most critical facts that must NEVER leave context.
 * Auto-promotion: a fact mentioned 3+ times, or tagged quest-critical,
 * gets promoted to anchor automatically.
 */

export type FactCategory =
  | "character"    // player identity, race, class, etc.
  | "npc"          // NPC exists, disposition, relationships
  | "location"     // place descriptions, connections
  | "quest"        // quest state, objectives
  | "event"        // something that happened (combat result, discovery)
  | "item"         // item gained, lost, or notable
  | "world"        // world-building facts (politics, history, lore)
  | "death";       // an NPC or creature died — permanent

export interface Fact {
  id: string;
  /** When this fact was established */
  turn: number;
  timestamp: number;
  category: FactCategory;
  /** Human-readable fact statement */
  content: string;
  /** Tags for retrieval (e.g. NPC name, location name) */
  tags: string[];
  /** How many times this fact has been referenced */
  referenceCount: number;
  /** Is this fact an anchor (always in context)? */
  isAnchor: boolean;
  /** Is this fact quest-critical? */
  isQuestCritical: boolean;
  /** Has this fact been superseded by a newer fact? */
  supersededBy?: string;
}

/** Thresholds for auto-promotion to anchor status */
const ANCHOR_PROMOTION_THRESHOLD = 3;
const MAX_ANCHORS = 20;

export function createFact(
  id: string,
  turn: number,
  category: FactCategory,
  content: string,
  tags: string[],
  opts?: { isAnchor?: boolean; isQuestCritical?: boolean }
): Fact {
  return {
    id,
    turn,
    timestamp: Date.now(),
    category,
    content,
    tags,
    referenceCount: 0,
    isAnchor: opts?.isAnchor ?? false,
    isQuestCritical: opts?.isQuestCritical ?? false,
  };
}

/**
 * Check if a fact should be auto-promoted to anchor.
 * Criteria: referenced 3+ times, OR quest-critical.
 */
export function shouldPromoteToAnchor(fact: Fact, currentAnchorCount: number): boolean {
  if (fact.isAnchor) return false;
  if (currentAnchorCount >= MAX_ANCHORS) return false;
  if (fact.isQuestCritical) return true;
  if (fact.referenceCount >= ANCHOR_PROMOTION_THRESHOLD) return true;
  if (fact.category === "death") return true;
  return false;
}

/**
 * Query facts by tags. Returns facts whose tags overlap with the query tags.
 * Sorted by relevance (anchor first, then by reference count).
 */
export function queryFacts(facts: Fact[], queryTags: string[]): Fact[] {
  const lowerTags = queryTags.map((t) => t.toLowerCase());

  return facts
    .filter((f) => {
      if (f.supersededBy) return false;
      return f.tags.some((t) => lowerTags.includes(t.toLowerCase()));
    })
    .sort((a, b) => {
      // Anchors first
      if (a.isAnchor !== b.isAnchor) return a.isAnchor ? -1 : 1;
      // Then by reference count
      return b.referenceCount - a.referenceCount;
    });
}

/**
 * Get all anchor facts (always in context).
 */
export function getAnchors(facts: Fact[]): Fact[] {
  return facts.filter((f) => f.isAnchor && !f.supersededBy);
}

/**
 * Extract tags from player input for fact retrieval.
 * Finds proper nouns, location references, NPC names, etc.
 */
export function extractQueryTags(
  input: string,
  knownNpcNames: string[],
  knownLocationNames: string[]
): string[] {
  const tags: string[] = [];

  // Check for known NPC names
  for (const name of knownNpcNames) {
    if (input.toLowerCase().includes(name.toLowerCase())) {
      tags.push(name.toLowerCase());
    }
  }

  // Check for known location names
  for (const loc of knownLocationNames) {
    if (input.toLowerCase().includes(loc.toLowerCase())) {
      tags.push(loc.toLowerCase());
    }
  }

  // Extract capitalized proper nouns (potential new references)
  const properNouns = input.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?\b/g);
  if (properNouns) {
    for (const noun of properNouns) {
      const lower = noun.toLowerCase();
      // Skip common sentence starters
      const skip = ["the", "what", "where", "when", "how", "who", "why", "can", "could", "would", "should", "does", "did", "has", "have", "let", "tell", "show"];
      if (!skip.includes(lower) && !tags.includes(lower)) {
        tags.push(lower);
      }
    }
  }

  // Keyword extraction for common queries
  const keywords = input.toLowerCase();
  if (/cave|dungeon|tower|castle|forest|tavern|inn|village|town|city|temple|shrine|bridge|river|mountain/i.test(keywords)) {
    const locationMatch = keywords.match(/(cave|dungeon|tower|castle|forest|tavern|inn|village|town|city|temple|shrine|bridge|river|mountain)/i);
    if (locationMatch && !tags.includes(locationMatch[1])) {
      tags.push(locationMatch[1]);
    }
  }

  return tags;
}
