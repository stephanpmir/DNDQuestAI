import type { WorldEvent } from "@/types/world";

/**
 * Escalation timer: detect when a player is stuck in a loop
 * and inject progressive hints/alternatives.
 *
 * 3 failed attempts → NPC offers a hint
 * 5 failed attempts → alternative path opens
 * 7 failed attempts → scene auto-resolves with a cost
 */

interface LoopDetection {
  /** The general obstacle (location + action type) */
  obstacleKey: string;
  /** Number of consecutive failures */
  failCount: number;
}

function getObstacleKey(event: WorldEvent): string {
  return `${event.location}:${event.type}`;
}

/**
 * Analyze recent events to detect loops and return escalation hints.
 * Returns null if no escalation is needed.
 */
export function checkEscalation(
  recentEvents: WorldEvent[],
  currentLocation: string
): string | null {
  // Look at the last 10 events for patterns
  const relevant = recentEvents.slice(-10);
  if (relevant.length < 3) return null;

  // Count consecutive failures at the same obstacle
  const loops: Map<string, LoopDetection> = new Map();

  for (const event of relevant) {
    const key = getObstacleKey(event);
    const existing = loops.get(key);

    if (event.rollResult && !event.rollResult.success) {
      if (existing) {
        existing.failCount++;
      } else {
        loops.set(key, { obstacleKey: key, failCount: 1 });
      }
    } else {
      // Success resets the counter for this obstacle
      loops.delete(key);
    }
  }

  // Find the worst loop at the current location
  let worstLoop: LoopDetection | null = null;
  for (const loop of loops.values()) {
    if (!loop.obstacleKey.startsWith(currentLocation)) continue;
    if (!worstLoop || loop.failCount > worstLoop.failCount) {
      worstLoop = loop;
    }
  }

  if (!worstLoop) return null;

  if (worstLoop.failCount >= 7) {
    return "ESCALATION_AUTORESOLVE: The player has failed 7+ times at this obstacle. The scene MUST auto-resolve: the player gets past the obstacle but suffers a cost (lose an item, take damage, lose gold, or gain a negative condition). Describe how they barely scrape through.";
  }

  if (worstLoop.failCount >= 5) {
    return "ESCALATION_ALTERNATIVE: The player has failed 5+ times. An alternative path MUST open up — a hidden passage, a sympathetic NPC, a different approach. Make it feel natural, not like a bailout.";
  }

  if (worstLoop.failCount >= 3) {
    return "ESCALATION_HINT: The player has failed 3+ times. A nearby NPC or environmental clue MUST offer a helpful hint about how to overcome this obstacle. Be subtle but clear.";
  }

  return null;
}
