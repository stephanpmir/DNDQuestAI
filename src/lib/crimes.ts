/**
 * Crime & Detection System
 *
 * Tracks unwitnessed crimes (theft, unprovoked killing) with escalating
 * detection probability. Guards periodically run intelligence checks to
 * piece together evidence and identify the player.
 *
 * Detection flow:
 * 1. Player commits a crime → logged with location, turn, type
 * 2. Each subsequent turn, detection probability increases
 * 3. Guard investigation check: d20 + INT mod vs detection DC
 * 4. On success: guards gain partial info (name OR appearance, not both)
 * 5. On second success: guards confirm identity → active warrant
 *
 * Evidence levels:
 * - none:        No one suspects anything
 * - rumor:       Someone noticed something off (owner checks inventory)
 * - description: Guards have a vague description (race/class but no name)
 * - named:       Guards have a name (from witnesses or victim)
 * - confirmed:   Guards have matched name + appearance → active warrant
 */

export type CrimeType = "theft" | "murder" | "assault" | "trespass" | "vandalism";

export type EvidenceLevel = "none" | "rumor" | "description" | "named" | "confirmed";

export interface Crime {
  id: string;
  type: CrimeType;
  /** Turn the crime was committed */
  turn: number;
  /** Location where the crime occurred */
  location: string;
  /** Brief description of what happened */
  description: string;
  /** Current evidence level */
  evidenceLevel: EvidenceLevel;
  /** Turn when the crime was first detected (rumor stage) */
  detectedTurn?: number;
  /** Is there an active warrant for this crime? */
  hasWarrant: boolean;
  /** Has the player been confronted about this crime? */
  confronted: boolean;
}

/** Detection DC decreases over time — crimes get easier to discover */
export function getDetectionDC(crime: Crime, currentTurn: number): number {
  const turnsElapsed = currentTurn - crime.turn;
  const baseDC: Record<CrimeType, number> = {
    theft: 18,      // Hard to notice at first
    murder: 12,     // Bodies are found quickly
    assault: 14,    // Victims report it
    trespass: 16,   // May go unnoticed
    vandalism: 15,  // Visible damage
  };

  const base = baseDC[crime.type];
  // DC drops by 2 every 3 turns (crime becomes more discoverable over time)
  const timeReduction = Math.floor(turnsElapsed / 3) * 2;
  return Math.max(5, base - timeReduction);
}

/** Guard intelligence modifier by fame — famous criminals are easier to identify */
function guardIntelBonus(fame: number): number {
  if (fame >= 75) return 5;  // Legendary — everyone knows your face
  if (fame >= 50) return 3;
  if (fame >= 30) return 2;
  if (fame >= 15) return 1;
  return 0;
}

export interface InvestigationResult {
  crimeId: string;
  success: boolean;
  rolled: number;
  dc: number;
  /** What evidence level the crime advances to */
  newEvidenceLevel: EvidenceLevel;
  /** Narrative hint for the DM */
  narrativeHint: string;
}

/**
 * Run a guard investigation check against a single crime.
 * Guards roll d20 + base INT mod (2) + fame bonus vs detection DC.
 */
export function investigateCrime(
  crime: Crime,
  currentTurn: number,
  playerFame: number
): InvestigationResult | null {
  // Already confirmed or confronted — no more checks needed
  if (crime.evidenceLevel === "confirmed" || crime.confronted) return null;

  // Too recent — give at least 2 turns before any check
  if (currentTurn - crime.turn < 2) return null;

  const dc = getDetectionDC(crime, currentTurn);
  const guardIntMod = 2; // Base guard INT modifier
  const fameMod = guardIntelBonus(playerFame);
  const rolled = Math.floor(Math.random() * 20) + 1;
  const total = rolled + guardIntMod + fameMod;
  const success = total >= dc;

  if (!success) {
    return {
      crimeId: crime.id,
      success: false,
      rolled,
      dc,
      newEvidenceLevel: crime.evidenceLevel,
      narrativeHint: "",
    };
  }

  // Advance evidence level
  const evidenceProgression: Record<EvidenceLevel, EvidenceLevel> = {
    none: "rumor",
    rumor: "description",
    description: "named",
    named: "confirmed",
    confirmed: "confirmed",
  };

  const newLevel = evidenceProgression[crime.evidenceLevel];

  const hints: Record<EvidenceLevel, string> = {
    none: "",
    rumor: `Someone at ${crime.location} has noticed something amiss related to a recent ${crime.type}. Whispers are starting.`,
    description: `Guards are looking for someone matching the player's race and class in connection with a ${crime.type} at ${crime.location}.`,
    named: `Guards now have the player's name connected to the ${crime.type} at ${crime.location}. They're asking around.`,
    confirmed: `WANTED: Guards have confirmed the player's identity for the ${crime.type} at ${crime.location}. They will confront the player on sight.`,
  };

  return {
    crimeId: crime.id,
    success: true,
    rolled,
    dc,
    newEvidenceLevel: newLevel,
    narrativeHint: hints[newLevel],
  };
}

/**
 * Run investigation checks on all active crimes.
 * Called once per turn. Only checks one crime per turn to avoid
 * overwhelming the player with multiple investigations at once.
 */
export function runGuardInvestigations(
  crimes: Crime[],
  currentTurn: number,
  playerFame: number
): InvestigationResult | null {
  // Filter to crimes that still need investigation
  const activeCrimes = crimes.filter(
    (c) => c.evidenceLevel !== "confirmed" && !c.confronted
  );

  if (activeCrimes.length === 0) return null;

  // Prioritize: oldest unresolved crimes first (they've had more time to be discovered)
  const sorted = [...activeCrimes].sort((a, b) => a.turn - b.turn);

  for (const crime of sorted) {
    const result = investigateCrime(crime, currentTurn, playerFame);
    if (result && result.success) return result;
  }

  // No successful investigations this turn
  return null;
}

/** Detect crime type from player input */
export function detectCrime(playerInput: string): CrimeType | null {
  const lower = playerInput.toLowerCase();

  // Murder / killing
  if (/\b(kill|murder|slay|stab|assassinate|execute)\b/.test(lower) &&
      /\b(innocent|civilian|shopkeeper|owner|merchant|guard|npc|person|man|woman|villager|bystander|bartender|innkeeper)\b/.test(lower)) {
    return "murder";
  }

  // Theft / stealing
  if (/\b(steal|take|pocket|pilfer|swipe|grab|snatch|pickpocket|loot|rob)\b/.test(lower) &&
      !/\b(from (the )?enemy|from (the )?(goblin|bandit|orc|monster|creature|undead|demon))\b/.test(lower)) {
    return "theft";
  }

  // Assault
  if (/\b(punch|hit|attack|strike|kick|shove|push)\b/.test(lower) &&
      /\b(innocent|civilian|shopkeeper|owner|merchant|guard|bartender|innkeeper|villager|person|man|woman)\b/.test(lower)) {
    return "assault";
  }

  return null;
}

/**
 * Check if guards at the current location should confront the player.
 * Guards confront when they have a confirmed warrant and encounter the player.
 */
export function shouldGuardsConfront(
  crimes: Crime[],
  currentLocation: string
): Crime | null {
  // Find confirmed, unconfroned crimes — guards are actively looking
  const warrant = crimes.find(
    (c) => c.evidenceLevel === "confirmed" && !c.confronted
  );

  if (!warrant) return null;

  // Guards are everywhere in towns/cities — 60% chance they're at this location
  const guardPresence = Math.random() < 0.6;
  if (!guardPresence) return null;

  return warrant;
}

/**
 * Build a summary of the crime situation for the DM prompt context.
 */
export function buildCrimeContext(crimes: Crime[]): string {
  if (crimes.length === 0) return "";

  const activeCrimes = crimes.filter((c) => !c.confronted);
  if (activeCrimes.length === 0) return "";

  const lines: string[] = ["## Crime & Investigation Status"];

  for (const crime of activeCrimes) {
    const status = crime.hasWarrant
      ? "ACTIVE WARRANT — guards will confront on sight"
      : crime.evidenceLevel === "named"
        ? "Guards know the player's name — close to issuing warrant"
        : crime.evidenceLevel === "description"
          ? "Guards have a vague description — may recognize the player"
          : crime.evidenceLevel === "rumor"
            ? "Rumors spreading — someone noticed something"
            : "Undetected";

    lines.push(`- ${crime.type} at ${crime.location} (turn ${crime.turn}): ${status}`);
  }

  lines.push(
    "\nNarrate guard behavior based on evidence level. At 'description' level, " +
    "guards give the player suspicious looks. At 'named', they ask pointed questions. " +
    "At 'confirmed', they attempt arrest."
  );

  return lines.join("\n");
}
