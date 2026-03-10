/**
 * Stress test: simulate 3 characters playing through the rules engine to level 20.
 * Run with: npx tsx src/test/stress-test.ts
 */

const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000,
  8: 34000, 9: 48000, 10: 64000, 11: 85000, 12: 100000, 13: 120000,
  14: 140000, 15: 165000, 16: 195000, 17: 225000, 18: 265000,
  19: 305000, 20: 355000,
};

function getXpToNextLevel(level: number): number {
  return XP_THRESHOLDS[level + 1] ?? Infinity;
}

interface AbilityScores {
  strength: number; dexterity: number; constitution: number;
  wisdom: number; intelligence: number; charisma: number;
}

interface Character {
  name: string; gender: string; race: string; class: string;
  level: number; hp: number; maxHp: number; ac: number;
  xp: number; xpToNextLevel: number;
  abilityScores: AbilityScores;
  inventory: string[]; gold: number;
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
  roll?: RollResult;
  hpChange: number; itemsGained: string[]; itemsLost: string[];
  goldChange: number; xpGained: number;
  locationChange?: string; newQuest?: string; completeQuest?: string;
  escalationHint?: string; newNpcs: string[];
  restDenied?: boolean; lastRestTurn?: number;
  deathSaveResult?: "nat20" | "nat1" | "success" | "failure";
  damageDealt?: number; isCriticalHit?: boolean;
  damageTaken?: number; itemNotFound?: boolean;
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
  const total = Math.max(1, raw);
  return { type: "damage", rolled: dice.reduce((a, b) => a + b, 0), modifier: bonus, total, success: true };
}

// ── Rules Engine (matches updated rules.ts) ─────────────────────
const MIN_TURNS_BETWEEN_RESTS = 5;

const ACTION_PATTERNS: [RegExp, string][] = [
  [/\b(attack|strike|hit|fight|slash|stab|shoot|swing)\b/i, "attack"],
  [/\b(cast|spell|magic|fireball|heal|cure)\b/i, "cast_spell"],
  [/\b(pick lock|sneak|hide|stealth|climb|swim|jump|search|investigate|persuade|intimidate|deceive|perception|check)\b/i, "skill_check"],
  [/\b(explore|look around|examine|enter|go to|travel|move|walk|head)\b/i, "explore"],
  [/\b(talk|speak|ask|greet|negotiate|converse|say)\b/i, "talk"],
  [/\b(rest|sleep|camp|long rest|short rest)\b/i, "rest"],
  [/\b(buy|sell|trade|shop|purchase|barter)\b/i, "trade"],
  [/\b(use|drink|eat|equip|open|read)\b/i, "use_item"],
];

const SELF_HARM_PATTERNS = [
  /\b(?:set (?:myself|me|my) on fire|burn myself|light myself)\b/i,
  /\b(?:drink|consume|ingest)\s+(?:the\s+)?(?:poison|venom|acid|lava)\b/i,
  /\b(?:stab|cut|hurt|harm|attack|hit)\s+(?:myself|me)\b/i,
  /\b(?:jump off|leap off|throw myself|jump into)\s+(?:the\s+)?(?:cliff|lava|fire|pit|void|abyss)\b/i,
];

function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

function scaledEnemy(level: number) {
  const prof = proficiencyBonus(level);
  return {
    ac: 10 + prof,
    attackBonus: prof + 1,
    damageDice: { count: 1, sides: 6 },
    damageBonus: Math.floor(level / 4),
  };
}

function levelScaledDC(baseDC: number, level: number): number {
  return baseDC + Math.floor(proficiencyBonus(level) / 2);
}

function detectAction(input: string, char: Character): string {
  if (char.isUnconscious && char.hp <= 0) return "death_save";
  for (const p of SELF_HARM_PATTERNS) if (p.test(input)) return "self_harm";
  for (const [p, a] of ACTION_PATTERNS) if (p.test(input)) return a;
  return "unknown";
}

function getSkillAbility(input: string): keyof AbilityScores {
  const lower = input.toLowerCase();
  if (/stealth|sneak|hide|pick lock|sleight|acrobat/i.test(lower)) return "dexterity";
  if (/persuade|deceive|perform|intimidate/i.test(lower)) return "charisma";
  if (/investigate|arcana|history|religion/i.test(lower)) return "intelligence";
  if (/perception|insight|survival|medicine|animal/i.test(lower)) return "wisdom";
  if (/climb|swim|jump|grapple|shove|athletics/i.test(lower)) return "strength";
  return "wisdom";
}

function combatXpReward(level: number): number {
  const baseXp = [25, 50, 75, 100, 150, 200, 250, 350, 450, 550, 650, 800, 950, 1100, 1300, 1500, 1700, 2000, 2300, 2600];
  return baseXp[Math.min(level - 1, 19)];
}
function skillCheckXpReward(level: number) { return Math.max(5, Math.floor(combatXpReward(level) / 5)); }
function explorationXpReward(level: number) { return Math.max(3, Math.floor(combatXpReward(level) / 10)); }

function resolveAction(input: string, char: Character, gs: { location: string; questLog: string[]; turnCount: number }): EngineOutcome {
  const action = detectAction(input, char);
  const outcome: EngineOutcome = { hpChange: 0, itemsGained: [], itemsLost: [], goldChange: 0, xpGained: 0, newNpcs: [] };

  switch (action) {
    case "death_save": {
      const rolled = d20();
      outcome.roll = { type: "save", ability: "death", dc: 10, rolled, modifier: 0, total: rolled, success: rolled >= 10 };
      if (rolled === 20) { outcome.hpChange = 1; outcome.deathSaveResult = "nat20"; }
      else if (rolled === 1) { outcome.deathSaveResult = "nat1"; }
      else if (rolled >= 10) { outcome.deathSaveResult = "success"; }
      else { outcome.deathSaveResult = "failure"; }
      break;
    }
    case "self_harm": {
      const conSave = abilityCheck(char.abilityScores.constitution, 12, "constitution");
      outcome.roll = { ...conSave, type: "save" };
      const dmg = damageRoll(1, 6, 2);
      outcome.hpChange = conSave.success ? -Math.max(1, Math.floor(dmg.total / 2)) : -dmg.total;
      break;
    }
    case "attack":
    case "cast_spell": {
      const atkAbility = action === "cast_spell" ? "intelligence" : "strength";
      const atkScore = char.abilityScores[atkAbility];
      const atkMod = mod(atkScore);
      const prof = proficiencyBonus(char.level);
      const enemy = scaledEnemy(char.level);
      const hit = attackRoll(atkScore, enemy.ac, prof);
      outcome.roll = hit;
      if (hit.success) {
        const isCrit = hit.rolled === 20;
        const baseDice = action === "cast_spell" ? 2 : 1;
        const sides = action === "cast_spell" ? 6 : 8;
        const diceCount = isCrit ? baseDice * 2 : baseDice;
        const dmg = damageRoll(diceCount, sides, atkMod);
        outcome.damageDealt = Math.max(1, dmg.total);
        outcome.isCriticalHit = isCrit;
        outcome.xpGained = combatXpReward(char.level);
      } else {
        const enemyRoll = d20();
        if (enemyRoll + enemy.attackBonus >= char.ac) {
          const enemyDmg = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          outcome.hpChange = -Math.max(1, enemyDmg.total);
          outcome.damageTaken = Math.max(1, enemyDmg.total);
        }
      }
      break;
    }
    case "skill_check": {
      const ability = getSkillAbility(input);
      const dc = levelScaledDC(12, char.level);
      const prof = proficiencyBonus(char.level);
      outcome.roll = abilityCheck(char.abilityScores[ability], dc, ability, prof);
      if (outcome.roll.success) outcome.xpGained = skillCheckXpReward(char.level);
      break;
    }
    case "explore": {
      const dc = levelScaledDC(10, char.level);
      const prof = proficiencyBonus(char.level);
      outcome.roll = abilityCheck(char.abilityScores.wisdom, dc, "wisdom", prof);
      if (outcome.roll.success) outcome.xpGained = explorationXpReward(char.level);
      break;
    }
    case "rest": {
      if (char.isUnconscious) { outcome.restDenied = true; break; }
      const since = char.lastRestTurn >= 0 ? gs.turnCount - char.lastRestTurn : Infinity;
      if (since < MIN_TURNS_BETWEEN_RESTS) { outcome.restDenied = true; break; }
      const conMod = mod(char.abilityScores.constitution);
      const healed = Math.max(1, Math.floor(char.maxHp * 0.25) + conMod);
      outcome.hpChange = Math.min(healed, char.maxHp - char.hp);
      outcome.lastRestTurn = gs.turnCount;
      break;
    }
    case "talk": {
      const dc = levelScaledDC(11, char.level);
      const prof = proficiencyBonus(char.level);
      outcome.roll = abilityCheck(char.abilityScores.charisma, dc, "charisma", prof);
      if (outcome.roll.success) outcome.xpGained = skillCheckXpReward(char.level);
      break;
    }
    case "use_item": {
      const lower = input.toLowerCase();
      const matched = char.inventory.find(item => lower.includes(item.toLowerCase()));
      if (matched) {
        const itemLower = matched.toLowerCase();
        const consumables = ["potion", "rations", "scroll", "elixir", "antidote"];
        if (consumables.some(c => itemLower.includes(c))) {
          outcome.itemsLost = [matched];
          if (itemLower.includes("healing") || itemLower.includes("health") ||
              (itemLower.includes("potion") && !itemLower.includes("poison"))) {
            const healed = damageRoll(2, 4, 2);
            outcome.hpChange = Math.min(healed.total, char.maxHp - char.hp);
          }
          if (itemLower.includes("poison")) outcome.hpChange = -damageRoll(2, 4, 0).total;
        }
      } else {
        outcome.itemNotFound = true;
      }
      break;
    }
    case "trade":
    case "unknown":
      break;
  }
  return outcome;
}

// ── Character helpers ───────────────────────────────────────────
const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};

function computeMaxHpForLevel(cls: string, conScore: number, level: number): number {
  const hitDie = HIT_DICE[cls] ?? 8;
  const conMod = mod(conScore);
  const avgRoll = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + (level - 1) * (avgRoll + conMod);
}

function roll4d6DropLowest(): number {
  const dice = roll(4, 6).sort((a, b) => b - a);
  return dice[0] + dice[1] + dice[2];
}

function createCharacter(name: string, gender: string, race: string, cls: string): Character {
  const scores: AbilityScores = {
    strength: roll4d6DropLowest(), dexterity: roll4d6DropLowest(),
    constitution: roll4d6DropLowest(), wisdom: roll4d6DropLowest(),
    intelligence: roll4d6DropLowest(), charisma: roll4d6DropLowest(),
  };
  const hp = (HIT_DICE[cls] ?? 8) + mod(scores.constitution);
  return {
    name, gender, race, class: cls, level: 1, hp, maxHp: hp, ac: 14,
    xp: 0, xpToNextLevel: getXpToNextLevel(1),
    abilityScores: scores, inventory: ["Longsword", "Shield", "Healing Potion", "Rations (3 days)"],
    gold: 15, lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 },
    isUnconscious: false, isDead: false,
  };
}

function applyOutcome(char: Character, outcome: EngineOutcome, turnCount: number): void {
  if (outcome.hpChange) {
    char.hp = Math.max(0, Math.min(char.maxHp, char.hp + outcome.hpChange));
  }
  if (char.hp <= 0 && !char.isUnconscious) {
    char.isUnconscious = true;
    char.hp = 0;
    char.deathSaves = { successes: 0, failures: 0 };
  }
  if (char.hp > 0 && char.isUnconscious) {
    char.isUnconscious = false;
    char.deathSaves = { successes: 0, failures: 0 };
  }
  if (outcome.deathSaveResult) {
    if (outcome.deathSaveResult === "nat20") {
      char.deathSaves = { successes: 0, failures: 0 };
    } else if (outcome.deathSaveResult === "nat1") {
      char.deathSaves.failures = Math.min(3, char.deathSaves.failures + 2);
    } else if (outcome.deathSaveResult === "success") {
      char.deathSaves.successes = Math.min(3, char.deathSaves.successes + 1);
    } else if (outcome.deathSaveResult === "failure") {
      char.deathSaves.failures = Math.min(3, char.deathSaves.failures + 1);
    }
    if (char.deathSaves.failures >= 3) char.isDead = true;
    if (char.deathSaves.successes >= 3) {
      char.deathSaves = { successes: 0, failures: 0 };
      char.hp = 1;
      char.isUnconscious = false;
    }
  }
  for (const item of outcome.itemsLost) {
    const idx = char.inventory.indexOf(item);
    if (idx >= 0) char.inventory.splice(idx, 1);
  }
  for (const item of outcome.itemsGained) char.inventory.push(item);
  char.gold += outcome.goldChange;
  if (outcome.lastRestTurn !== undefined) char.lastRestTurn = outcome.lastRestTurn;
  if (outcome.xpGained > 0) {
    char.xp += outcome.xpGained;
    while (char.level < 20 && char.xp >= char.xpToNextLevel) {
      char.level++;
      char.xpToNextLevel = getXpToNextLevel(char.level);
      const newMaxHp = computeMaxHpForLevel(char.class, char.abilityScores.constitution, char.level);
      const increase = newMaxHp - char.maxHp;
      char.maxHp = newMaxHp;
      char.hp = Math.min(char.maxHp, char.hp + increase);
    }
  }
}

// ── Simulation ──────────────────────────────────────────────────
const ACTIONS = [
  "I attack the goblin with my sword",
  "I cast fireball at the enemy",
  "I try to pick the lock on the door",
  "I sneak past the guards",
  "I persuade the merchant to lower the price",
  "I explore the dark cave",
  "I look around the room",
  "I rest by the campfire",
  "I talk to the innkeeper",
  "I use my Healing Potion",
  "I climb the wall",
  "I investigate the strange markings",
  "I attack the dragon",
  "I intimidate the bandit",
  "I try to deceive the guard",
  "I search for hidden treasure",
  "I go to the tavern",
  "I swing my axe at the skeleton",
  "I cast heal on myself",
  "I jump across the chasm",
];

interface BugReport { character: string; turn: number; bug: string; details: string; }

function simulate(char: Character, maxTurns: number): { bugs: BugReport[]; stats: Record<string, number> } {
  const bugs: BugReport[] = [];
  const stats: Record<string, number> = {
    totalTurns: 0, combats: 0, hits: 0, misses: 0, crits: 0,
    damageDealt: 0, damageTaken: 0, deathSaves: 0,
    timesUnconscious: 0, timesRevived: 0, restsDenied: 0,
    restsSucceeded: 0, skillChecks: 0, levelUps: 0,
    xpTotal: 0, healingDone: 0, explorations: 0,
    itemsNotFound: 0, deaths: 0,
    nat20s: 0, nat1s: 0, talks: 0, talkSuccesses: 0,
  };

  const gs = { location: "Town Square", questLog: ["Find the ancient artifact"], turnCount: 0 };

  for (let turn = 0; turn < maxTurns; turn++) {
    if (char.isDead) {
      stats.deaths++;
      char.isDead = false; char.isUnconscious = false;
      char.hp = char.maxHp; char.deathSaves = { successes: 0, failures: 0 };
    }
    gs.turnCount = turn;
    stats.totalTurns++;

    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const prevLevel = char.level;
    const outcome = resolveAction(action, char, gs);

    // BUG CHECKS
    if (outcome.hpChange > 0 && char.hp + outcome.hpChange > char.maxHp) {
      bugs.push({ character: char.name, turn, bug: "HEAL_ABOVE_MAX",
        details: `Healing ${outcome.hpChange} from ${char.hp} exceeds max ${char.maxHp}` });
    }
    if (action.includes("talk") && outcome.roll && outcome.roll.ability !== "charisma" && outcome.roll.ability !== "death") {
      bugs.push({ character: char.name, turn, bug: "TALK_WRONG_ABILITY",
        details: `Talk used ${outcome.roll?.ability} instead of charisma` });
    }
    if (outcome.restDenied) {
      stats.restsDenied++;
      if (char.lastRestTurn < 0 && !char.isUnconscious) {
        bugs.push({ character: char.name, turn, bug: "REST_DENIED_FIRST_REST", details: `Never rested but rest denied` });
      }
    }
    if (outcome.damageDealt !== undefined && outcome.damageDealt <= 0) {
      bugs.push({ character: char.name, turn, bug: "ZERO_DAMAGE", details: `Damage dealt was ${outcome.damageDealt}` });
    }
    if (action.includes("rest") && !outcome.restDenied && outcome.hpChange === 0 && char.hp < char.maxHp && !char.isUnconscious) {
      bugs.push({ character: char.name, turn, bug: "REST_HEALS_ZERO",
        details: `Rest OK but healed 0 HP (hp: ${char.hp}/${char.maxHp})` });
    }

    // Stats
    if (outcome.roll?.type === "attack") {
      stats.combats++;
      if (outcome.roll.success) stats.hits++; else stats.misses++;
      if (outcome.isCriticalHit) stats.crits++;
      if (outcome.roll.rolled === 20) stats.nat20s++;
      if (outcome.roll.rolled === 1) stats.nat1s++;
    }
    if (action.includes("talk") && outcome.roll) { stats.talks++; if (outcome.roll.success) stats.talkSuccesses++; }
    if (outcome.damageDealt) stats.damageDealt += outcome.damageDealt;
    if (outcome.damageTaken) stats.damageTaken += outcome.damageTaken;
    if (outcome.deathSaveResult) stats.deathSaves++;
    if (outcome.roll?.type === "check") stats.skillChecks++;
    if (outcome.hpChange > 0 && action.includes("rest")) stats.restsSucceeded++;
    if (outcome.hpChange > 0 && !action.includes("rest")) stats.healingDone += outcome.hpChange;
    if (action.includes("explore") || action.includes("look")) stats.explorations++;

    const wasUC = char.isUnconscious;
    applyOutcome(char, outcome, turn);
    if (char.isUnconscious && !wasUC) stats.timesUnconscious++;
    if (!char.isUnconscious && wasUC) stats.timesRevived++;
    stats.xpTotal = char.xp;

    if (char.level > prevLevel) {
      stats.levelUps += (char.level - prevLevel);
      const expectedMaxHp = computeMaxHpForLevel(char.class, char.abilityScores.constitution, char.level);
      if (char.maxHp !== expectedMaxHp) {
        bugs.push({ character: char.name, turn, bug: "LEVEL_UP_HP_WRONG",
          details: `Level ${prevLevel}→${char.level}: maxHp=${char.maxHp}, expected ${expectedMaxHp}` });
      }
      console.log(`  [Turn ${turn}] LEVEL UP! ${prevLevel} → ${char.level} (XP: ${char.xp}, MaxHP: ${char.maxHp})`);
    }
    if (char.hp > char.maxHp) bugs.push({ character: char.name, turn, bug: "HP_EXCEEDS_MAX", details: `HP ${char.hp} > ${char.maxHp}` });
    if (char.hp < 0) bugs.push({ character: char.name, turn, bug: "NEGATIVE_HP", details: `HP is ${char.hp}` });
  }
  return { bugs, stats };
}

// ── Run ─────────────────────────────────────────────────────────
const characters = [
  createCharacter("Thorin", "Male", "Dwarf", "Fighter"),
  createCharacter("Elara", "Female", "Elf", "Wizard"),
  createCharacter("Grok", "Male", "Half-Orc", "Barbarian"),
];

console.log("=== STRESS TEST v2: D&D Rules Engine (with proficiency + balance fixes) ===\n");
const MAX_TURNS = 50000;
const allBugs: BugReport[] = [];

for (const char of characters) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Character: ${char.name} (${char.gender} ${char.race} ${char.class})`);
  console.log(`STR ${char.abilityScores.strength} DEX ${char.abilityScores.dexterity} CON ${char.abilityScores.constitution} INT ${char.abilityScores.intelligence} WIS ${char.abilityScores.wisdom} CHA ${char.abilityScores.charisma}`);
  console.log(`Starting HP: ${char.hp}/${char.maxHp}\n`);

  const { bugs, stats } = simulate(char, MAX_TURNS);
  allBugs.push(...bugs);

  const hitRate = stats.combats > 0 ? (stats.hits / stats.combats * 100).toFixed(1) : "N/A";
  const talkRate = stats.talks > 0 ? (stats.talkSuccesses / stats.talks * 100).toFixed(1) : "N/A";

  console.log(`\nFinal: Level ${char.level}, XP ${char.xp}/${char.xpToNextLevel}, HP ${char.hp}/${char.maxHp}`);
  console.log(`\nStats (${stats.totalTurns} turns):`);
  console.log(`  Combat: ${stats.combats} (${stats.hits} hits, ${stats.misses} miss, ${hitRate}% hit rate, ${stats.crits} crits)`);
  console.log(`  Nat 20s: ${stats.nat20s}, Nat 1s: ${stats.nat1s}`);
  console.log(`  Damage: dealt ${stats.damageDealt}, taken ${stats.damageTaken}`);
  console.log(`  Talks: ${stats.talks} (${stats.talkSuccesses} success, ${talkRate}% rate)`);
  console.log(`  Skill checks: ${stats.skillChecks}, Explorations: ${stats.explorations}`);
  console.log(`  Rests: ${stats.restsSucceeded} OK, ${stats.restsDenied} denied`);
  console.log(`  Level ups: ${stats.levelUps}, Deaths: ${stats.deaths}`);
  console.log(`  Unconscious: ${stats.timesUnconscious}x, Revived: ${stats.timesRevived}x`);

  if (bugs.length > 0) {
    console.log(`\n  BUGS: ${bugs.length}`);
    const bt = new Map<string, { count: number; ex: BugReport }>();
    for (const b of bugs) { const e = bt.get(b.bug); if (e) e.count++; else bt.set(b.bug, { count: 1, ex: b }); }
    for (const [t, { count, ex }] of bt) console.log(`    ${t} (×${count}): ${ex.details}`);
  } else {
    console.log(`\n  No bugs found!`);
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`TOTAL BUGS: ${allBugs.length}`);
if (allBugs.length > 0) {
  const bt = new Map<string, number>();
  for (const b of allBugs) bt.set(b.bug, (bt.get(b.bug) ?? 0) + 1);
  for (const [t, c] of [...bt.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${c}`);
}
console.log(`${"═".repeat(60)}`);
