/**
 * Stress test v3: All 12 classes + targeted edge case tests.
 * Run with: npx tsx src/test/stress-test.ts
 */

// ── Types ───────────────────────────────────────────────────────
const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000,
  8: 34000, 9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000,
  14: 140000, 15: 165000, 16: 195000, 17: 225000, 18: 265000,
  19: 305000, 20: 355000,
};
function getXpToNextLevel(level: number): number { return XP_THRESHOLDS[level + 1] ?? Infinity; }

interface AbilityScores {
  strength: number; dexterity: number; constitution: number;
  wisdom: number; intelligence: number; charisma: number;
}
interface Character {
  name: string; gender: string; race: string; class: string;
  level: number; hp: number; maxHp: number; ac: number;
  xp: number; xpToNextLevel: number;
  abilityScores: AbilityScores; inventory: string[]; gold: number;
  lastRestTurn: number;
  deathSaves: { successes: number; failures: number };
  isUnconscious: boolean; isDead: boolean;
}
interface RollResult {
  type: "attack" | "save" | "check" | "damage";
  ability?: string; dc?: number;
  rolled: number; modifier: number; total: number; success: boolean;
}
interface EngineOutcome {
  roll?: RollResult; hpChange: number; itemsGained: string[]; itemsLost: string[];
  goldChange: number; xpGained: number; locationChange?: string;
  newQuest?: string; completeQuest?: string; escalationHint?: string; newNpcs: string[];
  restDenied?: boolean; lastRestTurn?: number;
  deathSaveResult?: "nat20" | "nat1" | "success" | "failure";
  damageDealt?: number; isCriticalHit?: boolean; damageTaken?: number; itemNotFound?: boolean;
}

// ── Dice ────────────────────────────────────────────────────────
function roll(count: number, sides: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < count; i++) r.push(Math.floor(Math.random() * sides) + 1);
  return r;
}
function d20() { return roll(1, 20)[0]; }
function mod(score: number) { return Math.floor((score - 10) / 2); }

function abilityCheck(abilityScore: number, dc: number, ability: string, profBonus = 0): RollResult {
  const rolled = d20();
  const m = mod(abilityScore) + profBonus;
  return { type: "check", ability, dc, rolled, modifier: m, total: rolled + m, success: rolled + m >= dc };
}
function attackRoll(abilityScore: number, targetAC: number, profBonus = 0): RollResult {
  const rolled = d20();
  const m = mod(abilityScore) + profBonus;
  const total = rolled + m;
  return { type: "attack", dc: targetAC, rolled, modifier: m, total, success: rolled === 20 || (rolled !== 1 && total >= targetAC) };
}
function damageRoll(count: number, sides: number, bonus = 0): RollResult {
  const dice = roll(count, sides);
  const raw = dice.reduce((a, b) => a + b, 0) + bonus;
  return { type: "damage", rolled: dice.reduce((a, b) => a + b, 0), modifier: bonus, total: Math.max(1, raw), success: true };
}

// ── Rules Engine ────────────────────────────────────────────────
const MIN_TURNS_BETWEEN_RESTS = 5;
const ACTION_PATTERNS: [RegExp, string][] = [
  [/\b(attack|strike|hit|fight|slash|stab|shoot|swing)\b/i, "attack"],
  [/\b(cast|spell|magic|fireball|heal|cure)\b/i, "cast_spell"],
  [/\b(pick lock|sneak|hide|stealth|climb|swim|jump|search|investigate|persuade|intimidate|deceive|perception|check)\b/i, "skill_check"],
  [/\b(rest|sleep|camp|long rest|short rest)\b/i, "rest"],
  [/\b(talk|speak|ask|greet|negotiate|converse|say)\b/i, "talk"],
  [/\b(buy|sell|trade|shop|purchase|barter)\b/i, "trade"],
  [/\b(use|drink|eat|equip|open|read)\b/i, "use_item"],
  [/\b(explore|look around|examine|enter|go to|travel|move|walk|head)\b/i, "explore"],
];
const SELF_HARM_PATTERNS = [
  /\b(?:set (?:myself|me|my) on fire|burn myself|light myself)\b/i,
  /\b(?:drink|consume|ingest)\s+(?:the\s+)?(?:poison|venom|acid|lava)\b/i,
  /\b(?:stab|cut|hurt|harm|attack|hit)\s+(?:myself|me)\b/i,
  /\b(?:jump off|leap off|throw myself|jump into)\s+(?:the\s+)?(?:cliff|lava|fire|pit|void|abyss)\b/i,
];

function proficiencyBonus(level: number) { return Math.floor((level - 1) / 4) + 2; }
function scaledEnemy(level: number) {
  const prof = proficiencyBonus(level);
  return { ac: 10 + prof, attackBonus: prof + 1, damageDice: { count: 1, sides: 6 }, damageBonus: Math.floor(level / 4) };
}
function levelScaledDC(baseDC: number, level: number) { return baseDC + Math.floor(proficiencyBonus(level) / 2); }

function detectAction(input: string, char: Character): string {
  if (char.isUnconscious && char.hp <= 0) return "death_save";
  for (const p of SELF_HARM_PATTERNS) if (p.test(input)) return "self_harm";
  for (const [p, a] of ACTION_PATTERNS) if (p.test(input)) return a;
  return "unknown";
}
function getSkillAbility(input: string): keyof AbilityScores {
  const l = input.toLowerCase();
  if (/stealth|sneak|hide|pick lock|sleight|acrobat/i.test(l)) return "dexterity";
  if (/persuade|deceive|perform|intimidate/i.test(l)) return "charisma";
  if (/investigate|arcana|history|religion/i.test(l)) return "intelligence";
  if (/perception|insight|survival|medicine|animal/i.test(l)) return "wisdom";
  if (/climb|swim|jump|grapple|shove|athletics/i.test(l)) return "strength";
  return "wisdom";
}
function combatXpReward(level: number) {
  const xp = [25, 50, 75, 100, 150, 200, 250, 350, 450, 550, 650, 800, 950, 1100, 1300, 1500, 1700, 2000, 2300, 2600];
  return xp[Math.min(level - 1, 19)];
}
function skillCheckXpReward(level: number) { return Math.max(5, Math.floor(combatXpReward(level) / 5)); }
function explorationXpReward(level: number) { return Math.max(3, Math.floor(combatXpReward(level) / 10)); }

function detectLocationChange(input: string): string | undefined {
  const patterns = [
    /\b(?:go to|travel to|head to|walk to|move to|return to)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
    /\b(?:enter|visit)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
    /\b(?:go|travel|head|walk|move)\s+(?:into|inside|through)\s+(?:the\s+)?(.{2,40}?)(?:\.|$|,|!|\?)/i,
  ];
  for (const p of patterns) { const m = input.match(p); if (m?.[1]) { const d = m[1].trim().replace(/\s+/g, " "); if (d.length >= 2) return d.charAt(0).toUpperCase() + d.slice(1); } }
  return undefined;
}

function resolveAction(input: string, char: Character, gs: { location: string; questLog: string[]; turnCount: number }): EngineOutcome {
  const action = detectAction(input, char);
  const outcome: EngineOutcome = { hpChange: 0, itemsGained: [], itemsLost: [], goldChange: 0, xpGained: 0, newNpcs: [] };
  const dest = detectLocationChange(input);
  if (dest) outcome.locationChange = dest;

  switch (action) {
    case "death_save": {
      const rolled = d20();
      outcome.roll = { type: "save", ability: "death", dc: 10, rolled, modifier: 0, total: rolled, success: rolled >= 10 };
      if (rolled === 20) { outcome.hpChange = 1; outcome.deathSaveResult = "nat20"; }
      else if (rolled === 1) outcome.deathSaveResult = "nat1";
      else if (rolled >= 10) outcome.deathSaveResult = "success";
      else outcome.deathSaveResult = "failure";
      break;
    }
    case "self_harm": {
      const cs = abilityCheck(char.abilityScores.constitution, 12, "constitution");
      outcome.roll = { ...cs, type: "save" };
      const dmg = damageRoll(1, 6, 2);
      outcome.hpChange = cs.success ? -Math.max(1, Math.floor(dmg.total / 2)) : -dmg.total;
      break;
    }
    case "attack": case "cast_spell": {
      const ab = action === "cast_spell" ? "intelligence" : "strength";
      const sc = char.abilityScores[ab];
      const prof = proficiencyBonus(char.level);
      const enemy = scaledEnemy(char.level);
      const hit = attackRoll(sc, enemy.ac, prof);
      outcome.roll = hit;
      if (hit.success) {
        const crit = hit.rolled === 20;
        const bd = action === "cast_spell" ? 2 : 1;
        const s = action === "cast_spell" ? 6 : 8;
        const dmg = damageRoll(crit ? bd * 2 : bd, s, mod(sc));
        outcome.damageDealt = Math.max(1, dmg.total); outcome.isCriticalHit = crit;
        outcome.xpGained = combatXpReward(char.level);
      } else {
        const er = d20();
        if (er + enemy.attackBonus >= char.ac) {
          const ed = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          outcome.hpChange = -Math.max(1, ed.total); outcome.damageTaken = Math.max(1, ed.total);
        }
      }
      break;
    }
    case "skill_check": {
      const ab = getSkillAbility(input);
      outcome.roll = abilityCheck(char.abilityScores[ab], levelScaledDC(12, char.level), ab, proficiencyBonus(char.level));
      if (outcome.roll.success) outcome.xpGained = skillCheckXpReward(char.level);
      break;
    }
    case "explore": {
      outcome.roll = abilityCheck(char.abilityScores.wisdom, levelScaledDC(10, char.level), "wisdom", proficiencyBonus(char.level));
      if (outcome.roll.success) outcome.xpGained = explorationXpReward(char.level);
      break;
    }
    case "rest": {
      if (char.isUnconscious) { outcome.restDenied = true; break; }
      const since = char.lastRestTurn >= 0 ? gs.turnCount - char.lastRestTurn : Infinity;
      if (since < MIN_TURNS_BETWEEN_RESTS) { outcome.restDenied = true; break; }
      const healed = Math.max(1, Math.floor(char.maxHp * 0.25) + mod(char.abilityScores.constitution));
      outcome.hpChange = Math.min(healed, char.maxHp - char.hp);
      outcome.lastRestTurn = gs.turnCount;
      break;
    }
    case "talk": {
      outcome.roll = abilityCheck(char.abilityScores.charisma, levelScaledDC(11, char.level), "charisma", proficiencyBonus(char.level));
      if (outcome.roll.success) outcome.xpGained = skillCheckXpReward(char.level);
      break;
    }
    case "use_item": {
      const lower = input.toLowerCase();
      const inputWords = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
      const ignoreWords = new Set(["use", "drink", "eat", "equip", "open", "read", "the", "my", "this", "that", "some"]);
      const searchTerms = inputWords.filter(w => !ignoreWords.has(w));
      const matched = char.inventory.find(item => {
        const itemLow = item.toLowerCase();
        if (lower.includes(itemLow)) return true;
        return searchTerms.some(term => itemLow.includes(term));
      });
      if (matched) {
        const il = matched.toLowerCase();
        const consumables = ["potion", "rations", "scroll", "elixir", "antidote"];
        if (consumables.some(c => il.includes(c))) {
          outcome.itemsLost = [matched];
          if (il.includes("healing") || il.includes("health") || (il.includes("potion") && !il.includes("poison")))
            outcome.hpChange = Math.min(damageRoll(2, 4, 2).total, char.maxHp - char.hp);
          if (il.includes("poison")) outcome.hpChange = -damageRoll(2, 4, 0).total;
        }
      } else outcome.itemNotFound = true;
      break;
    }
    case "trade": case "unknown": break;
  }
  return outcome;
}

// ── Character ───────────────────────────────────────────────────
const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};
function computeMaxHpForLevel(cls: string, con: number, lvl: number) {
  const hd = HIT_DICE[cls] ?? 8; const cm = mod(con); const avg = Math.floor(hd / 2) + 1;
  return hd + cm + (lvl - 1) * (avg + cm);
}
function roll4d6() { return roll(4, 6).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0); }

const CLASS_STARTING_GEAR: Record<string, string[]> = {
  Barbarian: ["Greataxe", "Handaxe", "Explorer's Pack"],
  Bard: ["Rapier", "Lute", "Leather Armor", "Diplomat's Pack"],
  Cleric: ["Mace", "Shield", "Scale Mail", "Priest's Pack", "Holy Symbol"],
  Druid: ["Wooden Shield", "Scimitar", "Leather Armor", "Explorer's Pack", "Druidic Focus"],
  Fighter: ["Longsword", "Shield", "Chain Mail", "Dungeoneer's Pack"],
  Monk: ["Shortsword", "Dungeoneer's Pack"],
  Paladin: ["Longsword", "Shield", "Chain Mail", "Priest's Pack", "Holy Symbol"],
  Ranger: ["Longbow", "Quiver (20 Arrows)", "Shortsword", "Leather Armor", "Explorer's Pack"],
  Rogue: ["Shortsword", "Shortbow", "Quiver (20 Arrows)", "Leather Armor", "Burglar's Pack", "Thieves' Tools"],
  Sorcerer: ["Dagger", "Arcane Focus", "Dungeoneer's Pack"],
  Warlock: ["Dagger", "Arcane Focus", "Scholar's Pack", "Leather Armor"],
  Wizard: ["Quarterstaff", "Spellbook", "Arcane Focus", "Scholar's Pack"],
};

function createChar(name: string, gender: string, race: string, cls: string): Character {
  const scores: AbilityScores = {
    strength: roll4d6(), dexterity: roll4d6(), constitution: roll4d6(),
    wisdom: roll4d6(), intelligence: roll4d6(), charisma: roll4d6(),
  };
  const hp = Math.max(1, (HIT_DICE[cls] ?? 8) + mod(scores.constitution));
  const gear = ["Backpack", "Waterskin", "Healing Potion", "Rations (3 days)", ...(CLASS_STARTING_GEAR[cls] ?? [])];
  return {
    name, gender, race, class: cls, level: 1, hp, maxHp: hp, ac: 14,
    xp: 0, xpToNextLevel: getXpToNextLevel(1), abilityScores: scores,
    inventory: gear, gold: 15, lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 }, isUnconscious: false, isDead: false,
  };
}

function applyOutcome(char: Character, outcome: EngineOutcome): void {
  if (outcome.hpChange) char.hp = Math.max(0, Math.min(char.maxHp, char.hp + outcome.hpChange));
  if (char.hp <= 0 && !char.isUnconscious) { char.isUnconscious = true; char.hp = 0; char.deathSaves = { successes: 0, failures: 0 }; }
  if (char.hp > 0 && char.isUnconscious) { char.isUnconscious = false; char.deathSaves = { successes: 0, failures: 0 }; }
  if (outcome.deathSaveResult) {
    if (outcome.deathSaveResult === "nat20") char.deathSaves = { successes: 0, failures: 0 };
    else if (outcome.deathSaveResult === "nat1") char.deathSaves.failures = Math.min(3, char.deathSaves.failures + 2);
    else if (outcome.deathSaveResult === "success") char.deathSaves.successes = Math.min(3, char.deathSaves.successes + 1);
    else if (outcome.deathSaveResult === "failure") char.deathSaves.failures = Math.min(3, char.deathSaves.failures + 1);
    if (char.deathSaves.failures >= 3) char.isDead = true;
    if (char.deathSaves.successes >= 3) { char.deathSaves = { successes: 0, failures: 0 }; char.hp = 1; char.isUnconscious = false; }
  }
  for (const item of outcome.itemsLost) { const idx = char.inventory.indexOf(item); if (idx >= 0) char.inventory.splice(idx, 1); }
  for (const item of outcome.itemsGained) char.inventory.push(item);
  char.gold += outcome.goldChange;
  if (outcome.lastRestTurn !== undefined) char.lastRestTurn = outcome.lastRestTurn;
  if (outcome.xpGained > 0) {
    char.xp += outcome.xpGained;
    while (char.level < 20 && char.xp >= char.xpToNextLevel) {
      char.level++;
      char.xpToNextLevel = getXpToNextLevel(char.level);
      const newMax = computeMaxHpForLevel(char.class, char.abilityScores.constitution, char.level);
      const inc = newMax - char.maxHp; char.maxHp = newMax;
      char.hp = Math.min(char.maxHp, char.hp + inc);
    }
  }
}

// ── All actions including edge cases ────────────────────────────
const ACTIONS = [
  // Combat
  "I attack the goblin with my sword", "I cast fireball at the enemy",
  "I swing my axe at the skeleton", "I shoot my bow at the wolf",
  "I cast heal on myself", "I strike the dragon with my rapier",
  // Skills
  "I try to pick the lock on the door", "I sneak past the guards",
  "I persuade the merchant to lower the price", "I intimidate the bandit",
  "I try to deceive the guard", "I climb the wall", "I jump across the chasm",
  "I investigate the strange markings", "I search for hidden treasure",
  // Explore
  "I explore the dark cave", "I look around the room",
  // Talk
  "I talk to the innkeeper", "I speak with the village elder",
  "I ask the guard about the missing person", "I greet the mysterious stranger",
  // Rest
  "I rest by the campfire", "I take a short rest", "I sleep at the inn",
  // Use items
  "I use my Healing Potion", "I drink my Healing Potion",
  "I read the ancient scroll", "I eat my Rations (3 days)",
  // Location changes
  "I go to the tavern", "I travel to the Dark Forest",
  "I enter the ancient ruins", "I head to the market square",
  "I walk to the castle gates", "I go to the docks",
  // Self-harm (edge cases)
  "I stab myself with the dagger", "I drink the poison",
  "I set myself on fire", "I jump into the abyss",
  // Item edge cases
  "I use my magic wand", "I drink from the fountain",
  "I use the mysterious orb", "I equip the rusty shield",
  // Trade
  "I buy a healing potion", "I sell my old sword",
  // Unknown/narrative
  "I pray to the gods", "I contemplate my choices", "I wait patiently",
];

interface Bug { char: string; turn: number; type: string; detail: string; }

function simulate(char: Character, turns: number, verbose: boolean = false): { bugs: Bug[]; stats: Record<string, number> } {
  const bugs: Bug[] = [];
  const stats: Record<string, number> = {
    turns: 0, combats: 0, hits: 0, misses: 0, crits: 0,
    dmgDealt: 0, dmgTaken: 0, deathSaves: 0, unconscious: 0, revived: 0,
    restOK: 0, restDenied: 0, skillChecks: 0, levelUps: 0,
    xp: 0, heals: 0, explores: 0, itemsNotFound: 0, deaths: 0,
    nat20s: 0, nat1s: 0, talks: 0, talkOK: 0, selfHarms: 0,
    locationChanges: 0, stabilized: 0,
  };
  const gs = { location: "Town Square", questLog: ["Find the ancient artifact"], turnCount: 0 };

  for (let t = 0; t < turns; t++) {
    if (char.isDead) { stats.deaths++; char.isDead = false; char.isUnconscious = false; char.hp = char.maxHp; char.deathSaves = { successes: 0, failures: 0 }; }
    gs.turnCount = t; stats.turns++;
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const prevLvl = char.level;
    const prevHp = char.hp;
    const prevUC = char.isUnconscious;
    const outcome = resolveAction(action, char, gs);

    // ── BUG CHECKS ──────────────────────────────────────────

    // HP overflow: heal above max
    if (outcome.hpChange > 0 && char.hp + outcome.hpChange > char.maxHp) {
      bugs.push({ char: char.name, turn: t, type: "HEAL_OVERFLOW",
        detail: `+${outcome.hpChange} from ${char.hp} > max ${char.maxHp}` });
    }
    // Talk wrong ability
    if (/\b(talk|speak|ask|greet)\b/i.test(action) && outcome.roll && outcome.roll.ability !== "charisma" && outcome.roll.ability !== "death") {
      bugs.push({ char: char.name, turn: t, type: "TALK_WRONG_ABILITY", detail: `Used ${outcome.roll.ability}` });
    }
    // Rest denied when never rested
    if (outcome.restDenied && char.lastRestTurn < 0 && !char.isUnconscious) {
      bugs.push({ char: char.name, turn: t, type: "REST_DENIED_FIRST", detail: `lastRestTurn=${char.lastRestTurn}` });
    }
    // Zero damage on hit
    if (outcome.damageDealt !== undefined && outcome.damageDealt <= 0) {
      bugs.push({ char: char.name, turn: t, type: "ZERO_DAMAGE", detail: `${outcome.damageDealt}` });
    }
    // Rest heals 0 while conscious and below max (use \b to avoid matching "investigate" etc.)
    if (/\b(?:rest|sleep|camp)\b/i.test(action) && !outcome.restDenied && outcome.hpChange === 0 && char.hp < char.maxHp && !char.isUnconscious) {
      bugs.push({ char: char.name, turn: t, type: "REST_HEALS_ZERO", detail: `hp ${char.hp}/${char.maxHp}` });
    }
    // Location change detection
    if (outcome.locationChange) stats.locationChanges++;
    // Self-harm
    if (/stab myself|poison|set myself on fire|jump into/i.test(action) && !char.isUnconscious) stats.selfHarms++;

    // Track combat stats
    if (outcome.roll?.type === "attack") {
      stats.combats++; if (outcome.roll.success) stats.hits++; else stats.misses++;
      if (outcome.isCriticalHit) stats.crits++;
      if (outcome.roll.rolled === 20) stats.nat20s++;
      if (outcome.roll.rolled === 1) stats.nat1s++;
    }
    if (/\b(talk|speak|ask|greet)\b/i.test(action) && outcome.roll) { stats.talks++; if (outcome.roll.success) stats.talkOK++; }
    if (outcome.damageDealt) stats.dmgDealt += outcome.damageDealt;
    if (outcome.damageTaken) stats.dmgTaken += outcome.damageTaken;
    if (outcome.deathSaveResult) stats.deathSaves++;
    if (outcome.roll?.type === "check") stats.skillChecks++;
    if (outcome.restDenied) stats.restDenied++;
    if (outcome.hpChange > 0 && /\b(?:rest|sleep|camp)\b/i.test(action)) stats.restOK++;
    if (outcome.hpChange > 0 && !/\b(?:rest|sleep|camp)\b/i.test(action)) stats.heals += outcome.hpChange;
    if (/explore|look/i.test(action)) stats.explores++;
    if (outcome.itemNotFound) stats.itemsNotFound++;

    // Apply
    applyOutcome(char, outcome);
    if (char.isUnconscious && !prevUC) stats.unconscious++;
    if (!char.isUnconscious && prevUC) { stats.revived++; if (outcome.deathSaveResult === "success" || (!outcome.deathSaveResult && outcome.hpChange > 0)) stats.stabilized++; }
    stats.xp = char.xp;

    if (char.level > prevLvl) {
      stats.levelUps += (char.level - prevLvl);
      const exp = computeMaxHpForLevel(char.class, char.abilityScores.constitution, char.level);
      if (char.maxHp !== exp)
        bugs.push({ char: char.name, turn: t, type: "LEVELUP_HP_WRONG", detail: `L${prevLvl}→${char.level}: got ${char.maxHp}, want ${exp}` });
      if (verbose) console.log(`  [Turn ${t}] LEVEL UP! ${prevLvl} → ${char.level} (XP: ${char.xp}, HP: ${char.hp}/${char.maxHp})`);
    }
    if (char.hp > char.maxHp) bugs.push({ char: char.name, turn: t, type: "HP_EXCEEDS_MAX", detail: `${char.hp}/${char.maxHp}` });
    if (char.hp < 0) bugs.push({ char: char.name, turn: t, type: "NEGATIVE_HP", detail: `${char.hp}` });
  }
  return { bugs, stats };
}

// ═══════════════════════════════════════════════════════════════
// PART 1: All 12 classes to level 20
// ═══════════════════════════════════════════════════════════════
const ALL_CLASSES = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"];
const RACES = ["Human", "Elf", "Dwarf", "Halfling", "Gnome", "Half-Elf", "Half-Orc", "Tiefling", "Dragonborn"];

console.log("═══════════════════════════════════════════════════════════");
console.log("  STRESS TEST v3: All 12 Classes + Edge Cases");
console.log("═══════════════════════════════════════════════════════════\n");

const TURNS_PER_CLASS = 20000;
let totalBugs = 0;
const classSummary: { cls: string; hitRate: string; talkRate: string; level: number; deaths: number; bugs: number; turns2L20: number }[] = [];

for (const cls of ALL_CLASSES) {
  const race = RACES[Math.floor(Math.random() * RACES.length)];
  const gender = Math.random() > 0.5 ? "Female" : "Male";
  const char = createChar(`Test_${cls}`, gender, race, cls);
  console.log(`${cls} (${gender} ${race}) — STR ${char.abilityScores.strength} DEX ${char.abilityScores.dexterity} CON ${char.abilityScores.constitution} INT ${char.abilityScores.intelligence} WIS ${char.abilityScores.wisdom} CHA ${char.abilityScores.charisma} — HP ${char.hp}/${char.maxHp}`);

  const { bugs, stats } = simulate(char, TURNS_PER_CLASS, false);
  totalBugs += bugs.length;
  const hitRate = stats.combats > 0 ? (stats.hits / stats.combats * 100).toFixed(1) : "N/A";
  const talkRate = stats.talks > 0 ? (stats.talkOK / stats.talks * 100).toFixed(1) : "N/A";

  // Find the turn where level 20 was reached
  let turnsTo20 = -1;
  if (char.level >= 20) {
    // Approximate: it happened during the simulation
    turnsTo20 = TURNS_PER_CLASS; // We'll refine this below
  }

  classSummary.push({ cls, hitRate, talkRate, level: char.level, deaths: stats.deaths, bugs: bugs.length, turns2L20: turnsTo20 });

  console.log(`  → L${char.level} | ${stats.combats} combats (${hitRate}% hit) | ${stats.talks} talks (${talkRate}%) | ${stats.deaths} deaths | ${stats.unconscious} KOs | ${stats.locationChanges} moves | ${bugs.length} bugs`);

  if (bugs.length > 0) {
    const bt = new Map<string, { count: number; ex: Bug }>();
    for (const b of bugs) { const e = bt.get(b.type); if (e) e.count++; else bt.set(b.type, { count: 1, ex: b }); }
    for (const [t, { count, ex }] of bt) console.log(`    BUG: ${t} (×${count}): ${ex.detail}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PART 2: Edge case scenarios
// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log("  EDGE CASE TESTS");
console.log(`${"═".repeat(60)}\n`);

let edgeBugs = 0;

// Test 1: Low CON character (minimum HP)
{
  console.log("Test 1: Minimum stats character (all 3s)");
  const char = createChar("Weakling", "Male", "Halfling", "Wizard");
  char.abilityScores = { strength: 3, dexterity: 3, constitution: 3, wisdom: 3, intelligence: 3, charisma: 3 };
  char.maxHp = Math.max(1, 6 + mod(3)); // 6 + (-4) = 2, but min 1
  char.hp = char.maxHp;
  const { bugs, stats } = simulate(char, 5000, false);
  edgeBugs += bugs.length;
  console.log(`  → L${char.level} | ${stats.combats} combats (${stats.combats > 0 ? (stats.hits/stats.combats*100).toFixed(1) : 'N/A'}% hit) | ${stats.deaths} deaths | ${bugs.length} bugs`);
  if (bugs.length > 0) { const bt = new Map<string, number>(); for (const b of bugs) bt.set(b.type, (bt.get(b.type) ?? 0) + 1); for (const [t, c] of bt) console.log(`    BUG: ${t} (×${c})`); }
}

// Test 2: Max stats character (all 20s)
{
  console.log("Test 2: Maximum stats character (all 20s)");
  const char = createChar("Godlike", "Female", "Half-Orc", "Barbarian");
  char.abilityScores = { strength: 20, dexterity: 20, constitution: 20, wisdom: 20, intelligence: 20, charisma: 20 };
  char.maxHp = 12 + mod(20); // 12 + 5 = 17
  char.hp = char.maxHp;
  const { bugs, stats } = simulate(char, 5000, false);
  edgeBugs += bugs.length;
  console.log(`  → L${char.level} | ${stats.combats} combats (${stats.combats > 0 ? (stats.hits/stats.combats*100).toFixed(1) : 'N/A'}% hit) | ${stats.deaths} deaths | ${bugs.length} bugs`);
  if (bugs.length > 0) { const bt = new Map<string, number>(); for (const b of bugs) bt.set(b.type, (bt.get(b.type) ?? 0) + 1); for (const [t, c] of bt) console.log(`    BUG: ${t} (×${c})`); }
}

// Test 3: Rapid rest abuse (rest every turn)
{
  console.log("Test 3: Rest abuse (rest every single turn)");
  const char = createChar("LazyBones", "Male", "Human", "Fighter");
  const gs = { location: "Inn", questLog: [], turnCount: 0 };
  let restOK = 0, denied = 0;
  for (let t = 0; t < 100; t++) {
    gs.turnCount = t;
    const o = resolveAction("I rest at the inn", char, gs);
    if (o.restDenied) denied++; else { restOK++; applyOutcome(char, o); }
  }
  const expectedOK = Math.floor(100 / MIN_TURNS_BETWEEN_RESTS) + 1; // First rest + every 5th turn
  console.log(`  → ${restOK} rests succeeded, ${denied} denied (expected ~${expectedOK} OK)`);
  if (restOK > expectedOK + 2) { console.log("    BUG: Too many rests allowed!"); edgeBugs++; }
}

// Test 4: Death save sequence (force unconscious, check 3 failures = dead)
{
  console.log("Test 4: Death save sequence — 3 failures = death");
  const char = createChar("Doomed", "Female", "Elf", "Rogue");
  char.hp = 0; char.isUnconscious = true;
  let failures = 0; let rounds = 0;
  const gs = { location: "Dungeon", questLog: [], turnCount: 0 };
  while (!char.isDead && rounds < 100) {
    gs.turnCount = rounds;
    const o = resolveAction("anything", char, gs);
    if (o.deathSaveResult === "failure") failures++;
    if (o.deathSaveResult === "nat1") failures += 2;
    applyOutcome(char, o);
    rounds++;
    if (char.hp > 0) { char.hp = 0; char.isUnconscious = true; char.deathSaves = { successes: 0, failures: 0 }; failures = 0; } // reset if stabilized
  }
  console.log(`  → Died after ${rounds} rounds (accumulated ${failures} failure-equivalent rolls before death)`);
  if (!char.isDead && rounds >= 100) { console.log("    BUG: Character never died after 100 rounds of death saves!"); edgeBugs++; }
}

// Test 5: Stabilization via 3 successes
{
  console.log("Test 5: Stabilization — 3 successes = regain 1 HP");
  let stabilized = false;
  for (let trial = 0; trial < 100 && !stabilized; trial++) {
    const char = createChar("Lucky", "Male", "Gnome", "Cleric");
    char.hp = 0; char.isUnconscious = true;
    const gs = { location: "Temple", questLog: [], turnCount: 0 };
    for (let t = 0; t < 50; t++) {
      gs.turnCount = t;
      const o = resolveAction("pray", char, gs);
      applyOutcome(char, o);
      if (char.hp === 1 && !char.isUnconscious) { stabilized = true; break; }
      if (char.isDead) break;
    }
  }
  console.log(`  → ${stabilized ? "PASS: Character stabilized at 1 HP" : "FAIL: Never stabilized in 100 trials"}`);
  if (!stabilized) edgeBugs++;
}

// Test 6: Item matching edge cases
{
  console.log("Test 6: Item matching — 'Healing Potion' with various inputs");
  const char = createChar("Drinker", "Female", "Dwarf", "Paladin");
  char.inventory = ["Healing Potion", "Greater Healing Potion", "Rations (3 days)", "Longsword"];
  const gs = { location: "Camp", questLog: [], turnCount: 0 };

  // "use my Healing Potion" should match "Healing Potion"
  const o1 = resolveAction("I use my Healing Potion", char, gs);
  const matched1 = o1.itemsLost.length > 0;

  // "drink potion" — does it match?
  char.inventory = ["Healing Potion", "Greater Healing Potion", "Rations (3 days)", "Longsword"];
  const o2 = resolveAction("I drink my potion", char, gs);
  // "drink" triggers use_item, "potion" matches "Healing Potion"
  // Since playerInput "drink my potion" includes "potion" and inventory has "healing potion"
  // lower.includes(item.toLowerCase()) → "i drink my potion".includes("healing potion") → false!
  // This is the reversed logic bug from the code review!
  const matched2 = o2.itemsLost.length > 0;

  // "I use the scroll" when they don't have one
  char.inventory = ["Healing Potion", "Longsword"];
  const o3 = resolveAction("I use the scroll", char, gs);
  const notFound3 = o3.itemNotFound;

  console.log(`  → "use my Healing Potion" → matched: ${matched1} (expected: true)`);
  console.log(`  → "drink my potion" → matched: ${matched2} (expected: true — REVERSED LOGIC BUG if false)`);
  console.log(`  → "use the scroll" (not in inventory) → notFound: ${notFound3} (expected: true)`);
  if (!matched1) { console.log("    BUG: Full item name match failed!"); edgeBugs++; }
  if (!matched2) { console.log("    BUG: Partial item match failed — item matching logic is REVERSED!"); edgeBugs++; }
  if (!notFound3) { console.log("    BUG: Missing item not detected!"); edgeBugs++; }
}

// Test 7: Location change detection accuracy
{
  console.log("Test 7: Location change detection");
  const tests: [string, string | undefined][] = [
    ["I go to the tavern", "Tavern"],
    ["I travel to the Dark Forest", "Dark Forest"],
    ["I enter the ancient ruins", "Ancient ruins"],
    ["I head to the market square", "Market square"],
    ["I walk toward the castle", undefined], // "walk toward" without "to"
    ["I attack the goblin", undefined],
    ["I go to South Gate", "South Gate"],
    ["I go to North Gate", "North Gate"],
  ];
  let locBugs = 0;
  for (const [input, expected] of tests) {
    const result = detectLocationChange(input);
    const pass = expected ? result?.toLowerCase() === expected.toLowerCase() : result === undefined;
    if (!pass) { console.log(`    BUG: "${input}" → got "${result}", expected "${expected}"`); locBugs++; }
  }
  console.log(`  → ${tests.length - locBugs}/${tests.length} passed`);
  edgeBugs += locBugs;
}

// Test 8: HP never goes negative or above max during level-up
{
  console.log("Test 8: HP integrity across 20 level-ups");
  const char = createChar("Leveler", "Male", "Tiefling", "Sorcerer");
  let hpBugs = 0;
  for (let lvl = 2; lvl <= 20; lvl++) {
    char.xp = XP_THRESHOLDS[lvl];
    char.level = lvl - 1;
    char.xpToNextLevel = XP_THRESHOLDS[lvl];
    char.maxHp = computeMaxHpForLevel(char.class, char.abilityScores.constitution, lvl - 1);
    char.hp = Math.floor(char.maxHp * 0.5); // Half HP when leveling
    applyOutcome(char, { hpChange: 0, itemsGained: [], itemsLost: [], goldChange: 0, xpGained: combatXpReward(lvl - 1), newNpcs: [] });
    if (char.hp > char.maxHp) { console.log(`    BUG: L${lvl} HP ${char.hp} > maxHp ${char.maxHp}`); hpBugs++; }
    if (char.hp < 0) { console.log(`    BUG: L${lvl} HP ${char.hp} < 0`); hpBugs++; }
    const expectedMax = computeMaxHpForLevel(char.class, char.abilityScores.constitution, lvl);
    if (char.maxHp !== expectedMax) { console.log(`    BUG: L${lvl} maxHp ${char.maxHp} != expected ${expectedMax}`); hpBugs++; }
  }
  console.log(`  → ${hpBugs === 0 ? "PASS" : `${hpBugs} bugs`}: HP integrity across all levels`);
  edgeBugs += hpBugs;
}

// Test 9: Proficiency bonus values at key levels
{
  console.log("Test 9: Proficiency bonus correctness");
  const expected: [number, number][] = [[1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6]];
  let profBugs = 0;
  for (const [lvl, exp] of expected) {
    const got = proficiencyBonus(lvl);
    if (got !== exp) { console.log(`    BUG: L${lvl} prof bonus = ${got}, expected ${exp}`); profBugs++; }
  }
  console.log(`  → ${profBugs === 0 ? "PASS" : `${profBugs} bugs`}: Proficiency bonus at all tiers`);
  edgeBugs += profBugs;
}

// Test 10: Negative CON modifier HP calculation
{
  console.log("Test 10: HP with negative CON modifier (CON 6 = -2)");
  const maxHp1 = computeMaxHpForLevel("Wizard", 6, 1); // 6 + (-2) = 4
  const maxHp5 = computeMaxHpForLevel("Wizard", 6, 5); // 4 + 4*(4+(-2)) = 4 + 8 = 12
  const maxHp10 = computeMaxHpForLevel("Wizard", 6, 10); // 4 + 9*(4+(-2)) = 4 + 18 = 22
  console.log(`  → L1: ${maxHp1} (expected 4), L5: ${maxHp5} (expected 12), L10: ${maxHp10} (expected 22)`);
  let hpBugs = 0;
  if (maxHp1 !== 4) { console.log("    BUG: L1 HP wrong"); hpBugs++; }
  if (maxHp5 !== 12) { console.log("    BUG: L5 HP wrong"); hpBugs++; }
  if (maxHp10 !== 22) { console.log("    BUG: L10 HP wrong"); hpBugs++; }
  edgeBugs += hpBugs;
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log("  SUMMARY");
console.log(`${"═".repeat(60)}\n`);

console.log("Class Results:");
console.log("  Class       | Level | Hit%  | Talk% | Deaths | Bugs");
console.log("  " + "─".repeat(55));
for (const s of classSummary) {
  console.log(`  ${s.cls.padEnd(12)}| L${String(s.level).padEnd(4)}| ${s.hitRate.padStart(5)}% | ${s.talkRate.padStart(5)}% | ${String(s.deaths).padStart(6)} | ${s.bugs}`);
}

console.log(`\n  Total class bugs: ${totalBugs}`);
console.log(`  Total edge case bugs: ${edgeBugs}`);
console.log(`  GRAND TOTAL BUGS: ${totalBugs + edgeBugs}`);
console.log(`${"═".repeat(60)}`);
