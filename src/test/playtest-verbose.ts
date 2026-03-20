/**
 * Verbose playtest: Watch characters play through adventures turn by turn.
 * Run with: npx tsx src/test/playtest-verbose.ts
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

// ── Rules Engine (mirrors src/lib/engine/rules.ts) ──────────────
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

// ── Character Creation ──────────────────────────────────────────
const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};
function computeMaxHpForLevel(cls: string, con: number, lvl: number) {
  const hd = HIT_DICE[cls] ?? 8; const cm = mod(con); const avg = Math.floor(hd / 2) + 1;
  const draconicBonus = cls === "Sorcerer" ? lvl : 0;
  return hd + cm + (lvl - 1) * (avg + cm) + draconicBonus;
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

// ═══════════════════════════════════════════════════════════════
// ADVENTURE SCENARIOS — Realistic multi-action sequences
// ═══════════════════════════════════════════════════════════════

interface Scenario {
  name: string;
  location: string;
  actions: string[];
}

const SCENARIOS: Scenario[] = [
  {
    name: "Goblin Ambush on the Road",
    location: "Forest Road",
    actions: [
      "I look around for signs of danger",
      "I attack the goblin archer",
      "I swing my weapon at the goblin chief",
      "I search the goblin corpses for loot",
      "I investigate the nearby cave entrance",
      "I sneak into the goblin cave",
      "I attack the goblin shaman",
      "I cast fireball at the remaining goblins",
      "I search for hidden treasure in the cave",
      "I rest by the campfire",
    ],
  },
  {
    name: "The Haunted Manor",
    location: "Ravenmoor Village",
    actions: [
      "I talk to the village elder about the haunted manor",
      "I go to the haunted manor",
      "I investigate the front door for traps",
      "I enter the manor",
      "I look around the dusty foyer",
      "I climb the creaking staircase",
      "I search the bedroom for clues",
      "I attack the ghost that appears",
      "I cast heal on myself",
      "I investigate the hidden passage behind the bookshelf",
      "I pick lock on the basement door",
      "I fight the undead skeleton",
      "I use my Healing Potion",
      "I search the basement for the cursed artifact",
      "I rest in a safe corner",
    ],
  },
  {
    name: "The Dragon's Lair",
    location: "Scorched Mountains",
    actions: [
      "I travel to the dragon's lair",
      "I sneak past the sleeping drakes",
      "I investigate the treasure hoard",
      "I attack the young dragon",
      "I swing my weapon at the dragon's wing",
      "I cast fireball at the dragon",
      "I drink my Healing Potion",
      "I attack the dragon again",
      "I shoot my bow at the dragon",
      "I strike the dragon with all my might",
      "I search the treasure hoard",
      "I rest among the dragon's treasure",
    ],
  },
  {
    name: "City Intrigue",
    location: "Brighthollow City",
    actions: [
      "I go to the tavern",
      "I talk to the barkeep about rumors",
      "I persuade the shady merchant to share information",
      "I go to the market square",
      "I buy a healing potion",
      "I investigate the abandoned warehouse",
      "I sneak through the back alley",
      "I pick lock on the warehouse door",
      "I fight the cultist guards",
      "I attack the cult leader",
      "I intimidate the captured cultist",
      "I search the warehouse for evidence",
      "I go to the city guard headquarters",
      "I talk to the captain of the guard",
      "I rest at the inn",
    ],
  },
  {
    name: "The Underdark Descent",
    location: "Gloomhollow Caverns",
    actions: [
      "I climb down the rope into the cavern",
      "I look around the phosphorescent cave",
      "I sneak past the giant spider nest",
      "I attack the phase spider",
      "I cast magic missile at the spider",
      "I investigate the ancient drow ruins",
      "I swim across the underground river",
      "I fight the cave troll",
      "I strike the troll with my sword",
      "I search for mushrooms and rations",
      "I rest in the abandoned drow outpost",
      "I talk to the friendly myconid",
      "I persuade the deep gnome to guide us",
      "I explore the crystal cavern",
      "I attack the mind flayer",
      "I cast heal on myself",
      "I use my Healing Potion",
    ],
  },
  {
    name: "The Pirate Cove",
    location: "Shipwreck Bay",
    actions: [
      "I swim to the hidden cove",
      "I sneak onto the pirate ship",
      "I pick lock on the captain's cabin",
      "I search for the treasure map",
      "I fight the pirate quartermaster",
      "I attack the pirate captain",
      "I swing my cutlass at the first mate",
      "I intimidate the remaining pirates",
      "I investigate the cargo hold",
      "I drink my healing potion",
      "I explore the hidden sea cave",
      "I climb the cliffside to the lighthouse",
      "I talk to the lighthouse keeper",
      "I rest at the lighthouse",
    ],
  },
  {
    name: "The Wizard's Tower",
    location: "Arcane Spire",
    actions: [
      "I investigate the magical barrier",
      "I cast dispel magic on the ward",
      "I enter the wizard's tower",
      "I look around the alchemy lab",
      "I search the bookshelves for spell scrolls",
      "I climb the spiral staircase",
      "I fight the animated armor",
      "I cast fireball at the golem",
      "I attack the construct guardian",
      "I investigate the wizard's study",
      "I read the ancient scroll",
      "I use my Healing Potion",
      "I persuade the wizard's familiar to help",
      "I explore the observatory",
      "I rest in the enchanted guest chamber",
    ],
  },
  {
    name: "Bandit Fortress Siege",
    location: "Iron Ridge Fortress",
    actions: [
      "I sneak up to the fortress walls",
      "I climb the outer wall",
      "I attack the bandit sentry",
      "I fight the bandit lieutenant",
      "I shoot my bow at the archers on the wall",
      "I strike the bandit warlord",
      "I swing my axe at the warlord's bodyguard",
      "I intimidate the remaining bandits",
      "I search the armory",
      "I investigate the dungeon cells",
      "I pick lock on the prisoner's chains",
      "I talk to the rescued merchant",
      "I rest in the cleared fortress",
      "I explore the underground tunnels",
    ],
  },
];

// ── Verbose Simulation ──────────────────────────────────────────

interface BugEntry { turn: number; type: string; detail: string; }

function formatRoll(r: RollResult): string {
  if (r.type === "attack") {
    return `d20(${r.rolled}) + ${r.modifier} = ${r.total} vs AC ${r.dc} → ${r.success ? "HIT" : "MISS"}`;
  }
  if (r.type === "save" && r.ability === "death") {
    return `d20(${r.rolled}) vs DC 10 → ${r.rolled === 20 ? "NAT 20!" : r.rolled === 1 ? "NAT 1!" : r.success ? "SUCCESS" : "FAILURE"}`;
  }
  if (r.type === "save") {
    return `CON save d20(${r.rolled}) + ${r.modifier} = ${r.total} vs DC ${r.dc} → ${r.success ? "RESISTED" : "FAILED"}`;
  }
  return `${r.ability} check d20(${r.rolled}) + ${r.modifier} = ${r.total} vs DC ${r.dc} → ${r.success ? "SUCCESS" : "FAIL"}`;
}

function formatHP(char: Character): string {
  if (char.isDead) return "DEAD";
  if (char.isUnconscious) return `0/${char.maxHp} [DYING: ${char.deathSaves.successes}S/${char.deathSaves.failures}F]`;
  return `${char.hp}/${char.maxHp}`;
}

function runPlaytest(char: Character, scenarios: Scenario[], maxTurns: number): BugEntry[] {
  const bugs: BugEntry[] = [];
  const gs = { location: "Town Square", questLog: ["Begin the adventure"], turnCount: 0 };
  let turn = 0;
  let scenarioIdx = 0;
  let actionIdx = 0;
  let totalDmgDealt = 0;
  let totalDmgTaken = 0;
  let combats = 0;
  let hits = 0;

  console.log(`\n  Starting at ${gs.location} — HP ${formatHP(char)}\n`);

  while (turn < maxTurns && char.level < 20) {
    // Cycle through scenarios
    const scenario = scenarios[scenarioIdx % scenarios.length];
    if (actionIdx === 0) {
      console.log(`  ┌─── ${scenario.name} (${scenario.location}) ───`);
      gs.location = scenario.location;
    }

    const action = scenario.actions[actionIdx];
    gs.turnCount = turn;
    const prevLevel = char.level;
    const prevHp = char.hp;
    const prevUC = char.isUnconscious;
    const prevDead = char.isDead;

    // If dead, resurrect for testing purposes
    if (char.isDead) {
      console.log(`  │ ☠  DIED! Resurrecting for continued testing...`);
      char.isDead = false;
      char.isUnconscious = false;
      char.hp = char.maxHp;
      char.deathSaves = { successes: 0, failures: 0 };
    }

    const outcome = resolveAction(action, char, gs);
    const detectedAction = detectAction(action, char);

    // Bug checks
    if (outcome.hpChange > 0 && char.hp + outcome.hpChange > char.maxHp) {
      bugs.push({ turn, type: "HEAL_OVERFLOW", detail: `+${outcome.hpChange} from ${char.hp} > max ${char.maxHp}` });
    }
    if (/\b(talk|speak|ask|greet)\b/i.test(action) && outcome.roll && outcome.roll.ability !== "charisma" && outcome.roll.ability !== "death") {
      bugs.push({ turn, type: "TALK_WRONG_ABILITY", detail: `Used ${outcome.roll.ability} instead of charisma` });
    }
    if (outcome.damageDealt !== undefined && outcome.damageDealt <= 0) {
      bugs.push({ turn, type: "ZERO_DAMAGE", detail: `Dealt ${outcome.damageDealt} damage` });
    }
    if (/\b(?:rest|sleep|camp)\b/i.test(action) && !outcome.restDenied && outcome.hpChange === 0 && char.hp < char.maxHp && !char.isUnconscious) {
      bugs.push({ turn, type: "REST_HEALS_ZERO", detail: `hp ${char.hp}/${char.maxHp}` });
    }

    // Apply outcome
    applyOutcome(char, outcome);

    // Post-apply bug checks
    if (char.hp > char.maxHp) bugs.push({ turn, type: "HP_EXCEEDS_MAX", detail: `${char.hp}/${char.maxHp}` });
    if (char.hp < 0) bugs.push({ turn, type: "NEGATIVE_HP", detail: `${char.hp}` });

    // Track combat stats
    if (outcome.roll?.type === "attack") { combats++; if (outcome.roll.success) hits++; }
    if (outcome.damageDealt) totalDmgDealt += outcome.damageDealt;
    if (outcome.damageTaken) totalDmgTaken += outcome.damageTaken;

    // ── Print turn ──
    let line = `  │ T${String(turn).padStart(4, "0")} `;

    // Action description
    const actionTag = `[${detectedAction.toUpperCase()}]`;
    line += `${actionTag.padEnd(13)} "${action}"`;
    console.log(line);

    // Roll result
    if (outcome.roll) {
      console.log(`  │        Roll: ${formatRoll(outcome.roll)}`);
    }

    // Outcome details
    const details: string[] = [];
    if (outcome.isCriticalHit) details.push("CRITICAL HIT!");
    if (outcome.damageDealt) details.push(`Dealt ${outcome.damageDealt} dmg`);
    if (outcome.damageTaken) details.push(`Took ${outcome.damageTaken} dmg`);
    if (outcome.hpChange > 0 && !outcome.deathSaveResult) details.push(`Healed ${outcome.hpChange} HP`);
    if (outcome.hpChange < 0 && !outcome.damageTaken) details.push(`Lost ${Math.abs(outcome.hpChange)} HP`);
    if (outcome.xpGained > 0) details.push(`+${outcome.xpGained} XP`);
    if (outcome.restDenied) details.push("Rest denied (too soon or unconscious)");
    if (outcome.locationChange) details.push(`→ Moved to ${outcome.locationChange}`);
    if (outcome.itemsLost.length > 0) details.push(`Used: ${outcome.itemsLost.join(", ")}`);
    if (outcome.itemNotFound) details.push("Item not found in inventory!");
    if (outcome.deathSaveResult) {
      const dsLabels: Record<string, string> = { nat20: "NAT 20 — Regained 1 HP!", nat1: "NAT 1 — 2 failures!", success: "Death save success", failure: "Death save failure" };
      details.push(dsLabels[outcome.deathSaveResult]);
    }

    if (details.length > 0) {
      console.log(`  │        ${details.join(" | ")}`);
    }

    // State change
    if (char.isUnconscious && !prevUC) {
      console.log(`  │        ⚠ KNOCKED UNCONSCIOUS at 0 HP!`);
    }
    if (!char.isUnconscious && prevUC && !char.isDead) {
      console.log(`  │        ✦ REGAINED CONSCIOUSNESS — HP ${char.hp}`);
    }
    if (char.isDead && !prevDead) {
      console.log(`  │        ☠ CHARACTER DIED — 3 death save failures!`);
    }

    // Level up
    if (char.level > prevLevel) {
      console.log(`  │        ★ LEVEL UP! ${prevLevel} → ${char.level} — HP ${prevHp}/${computeMaxHpForLevel(char.class, char.abilityScores.constitution, prevLevel)} → ${char.hp}/${char.maxHp} — XP ${char.xp}/${char.xpToNextLevel}`);
    }

    console.log(`  │        HP: ${formatHP(char)} | Gold: ${char.gold} | L${char.level} (${char.xp}/${char.xpToNextLevel} XP)`);

    turn++;
    actionIdx++;

    // Move to next scenario
    if (actionIdx >= scenario.actions.length) {
      console.log(`  └─── End of ${scenario.name}\n`);
      actionIdx = 0;
      scenarioIdx++;
    }
  }

  // Close scenario if mid-way
  if (actionIdx > 0) {
    console.log(`  └─── (Reached target level)\n`);
  }

  console.log(`  ─── FINAL STATS ───`);
  console.log(`  Level: ${char.level} | HP: ${formatHP(char)} | XP: ${char.xp}`);
  console.log(`  Combats: ${combats} (${combats > 0 ? (hits/combats*100).toFixed(1) : "N/A"}% hit rate)`);
  console.log(`  Total damage dealt: ${totalDmgDealt} | Total damage taken: ${totalDmgTaken}`);
  console.log(`  Gold: ${char.gold} | Items: ${char.inventory.length}`);
  console.log(`  Turns played: ${turn}`);
  console.log(`  Bugs found: ${bugs.length}`);

  return bugs;
}

// ═══════════════════════════════════════════════════════════════
// RUN PLAYTESTS
// ═══════════════════════════════════════════════════════════════

const PLAYTEST_CHARS: { name: string; gender: string; race: string; cls: string }[] = [
  { name: "Grimjaw", gender: "Male", race: "Half-Orc", cls: "Barbarian" },
  { name: "Lyra Dawnwhisper", gender: "Female", race: "Elf", cls: "Wizard" },
  { name: "Brother Thaddeus", gender: "Male", race: "Human", cls: "Cleric" },
  { name: "Shade", gender: "Female", race: "Tiefling", cls: "Rogue" },
  { name: "Tormund Ironforge", gender: "Male", race: "Dwarf", cls: "Paladin" },
  { name: "Whisper", gender: "Female", race: "Halfling", cls: "Monk" },
];

console.log("═══════════════════════════════════════════════════════════════");
console.log("  VERBOSE PLAYTEST — Watch the Adventure Unfold");
console.log("═══════════════════════════════════════════════════════════════");

let grandTotalBugs = 0;
const results: { name: string; cls: string; race: string; level: number; turns: number; bugs: number }[] = [];

for (const pc of PLAYTEST_CHARS) {
  console.log(`\n${"━".repeat(65)}`);
  const char = createChar(pc.name, pc.gender, pc.race, pc.cls);
  console.log(`  ${pc.name} — ${pc.gender} ${pc.race} ${pc.cls}`);
  console.log(`  STR ${char.abilityScores.strength} | DEX ${char.abilityScores.dexterity} | CON ${char.abilityScores.constitution} | INT ${char.abilityScores.intelligence} | WIS ${char.abilityScores.wisdom} | CHA ${char.abilityScores.charisma}`);
  console.log(`  HP ${char.hp}/${char.maxHp} | AC ${char.ac} | Prof +${proficiencyBonus(char.level)}`);
  console.log(`  Gear: ${char.inventory.join(", ")}`);
  console.log(`${"━".repeat(65)}`);

  // Shuffle scenarios for variety
  const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5);
  const bugs = runPlaytest(char, shuffled, 500);
  grandTotalBugs += bugs.length;
  results.push({ name: pc.name, cls: pc.cls, race: pc.race, level: char.level, turns: 500, bugs: bugs.length });

  if (bugs.length > 0) {
    console.log(`\n  ⚠ BUGS FOUND:`);
    const bt = new Map<string, { count: number; ex: BugEntry }>();
    for (const b of bugs) { const e = bt.get(b.type); if (e) e.count++; else bt.set(b.type, { count: 1, ex: b }); }
    for (const [t, { count, ex }] of bt) console.log(`    ${t} (×${count}): Turn ${ex.turn} — ${ex.detail}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(65)}`);
console.log("  PLAYTEST SUMMARY");
console.log(`${"═".repeat(65)}`);
console.log("  Character            | Class     | Race     | Level | Bugs");
console.log("  " + "─".repeat(60));
for (const r of results) {
  console.log(`  ${r.name.padEnd(21)}| ${r.cls.padEnd(10)}| ${r.race.padEnd(9)}| L${String(r.level).padEnd(4)} | ${r.bugs}`);
}
console.log(`\n  GRAND TOTAL BUGS: ${grandTotalBugs}`);
console.log(`${"═".repeat(65)}`);
