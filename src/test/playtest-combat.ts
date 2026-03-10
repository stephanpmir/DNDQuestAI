/**
 * Combat Gauntlet: Focused combat + death save stress test.
 * Tests consecutive fights, knockdowns, death saves, stabilization,
 * rest timing, item usage, and level-up HP transitions.
 * Run with: npx tsx src/test/playtest-combat.ts
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
function abilityCheck(s: number, dc: number, ab: string, pb = 0): RollResult {
  const r = d20(), m = mod(s) + pb;
  return { type: "check", ability: ab, dc, rolled: r, modifier: m, total: r + m, success: r + m >= dc };
}
function attackRoll(s: number, ac: number, pb = 0): RollResult {
  const r = d20(), m = mod(s) + pb, t = r + m;
  return { type: "attack", dc: ac, rolled: r, modifier: m, total: t, success: r === 20 || (r !== 1 && t >= ac) };
}
function damageRoll(c: number, s: number, b = 0): RollResult {
  const d = roll(c, s), raw = d.reduce((a, b) => a + b, 0) + b;
  return { type: "damage", rolled: d.reduce((a, b) => a + b, 0), modifier: b, total: Math.max(1, raw), success: true };
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
  const p = proficiencyBonus(level);
  return { ac: 10 + p, attackBonus: p + 1, damageDice: { count: 1, sides: 6 }, damageBonus: Math.floor(level / 4) };
}
function levelScaledDC(base: number, level: number) { return base + Math.floor(proficiencyBonus(level) / 2); }

function detectAction(input: string, char: Character): string {
  if (char.isUnconscious && char.hp <= 0) return "death_save";
  for (const p of SELF_HARM_PATTERNS) if (p.test(input)) return "self_harm";
  for (const [p, a] of ACTION_PATTERNS) if (p.test(input)) return a;
  return "unknown";
}
function getSkillAbility(input: string): keyof AbilityScores {
  const l = input.toLowerCase();
  if (/stealth|sneak|hide|pick lock/i.test(l)) return "dexterity";
  if (/persuade|deceive|intimidate/i.test(l)) return "charisma";
  if (/investigate|arcana|history/i.test(l)) return "intelligence";
  if (/perception|insight|survival/i.test(l)) return "wisdom";
  if (/climb|swim|jump|athletics/i.test(l)) return "strength";
  return "wisdom";
}
function combatXpReward(l: number) {
  const xp = [25,50,75,100,150,200,250,350,450,550,650,800,950,1100,1300,1500,1700,2000,2300,2600];
  return xp[Math.min(l - 1, 19)];
}
function skillXp(l: number) { return Math.max(5, Math.floor(combatXpReward(l) / 5)); }
function exploreXp(l: number) { return Math.max(3, Math.floor(combatXpReward(l) / 10)); }

function resolveAction(input: string, char: Character, gs: { location: string; questLog: string[]; turnCount: number }): EngineOutcome {
  const action = detectAction(input, char);
  const o: EngineOutcome = { hpChange: 0, itemsGained: [], itemsLost: [], goldChange: 0, xpGained: 0, newNpcs: [] };

  switch (action) {
    case "death_save": {
      const r = d20();
      o.roll = { type: "save", ability: "death", dc: 10, rolled: r, modifier: 0, total: r, success: r >= 10 };
      if (r === 20) { o.hpChange = 1; o.deathSaveResult = "nat20"; }
      else if (r === 1) o.deathSaveResult = "nat1";
      else if (r >= 10) o.deathSaveResult = "success";
      else o.deathSaveResult = "failure";
      break;
    }
    case "self_harm": {
      const sv = abilityCheck(char.abilityScores.constitution, 12, "constitution");
      o.roll = { ...sv, type: "save" };
      const d = damageRoll(1, 6, 2);
      o.hpChange = sv.success ? -Math.max(1, Math.floor(d.total / 2)) : -d.total;
      break;
    }
    case "attack": case "cast_spell": {
      const ab = action === "cast_spell" ? "intelligence" : "strength";
      const sc = char.abilityScores[ab]; const prof = proficiencyBonus(char.level);
      const enemy = scaledEnemy(char.level);
      const hit = attackRoll(sc, enemy.ac, prof);
      o.roll = hit;
      if (hit.success) {
        const crit = hit.rolled === 20;
        const bd = action === "cast_spell" ? 2 : 1;
        const sd = action === "cast_spell" ? 6 : 8;
        const d = damageRoll(crit ? bd * 2 : bd, sd, mod(sc));
        o.damageDealt = Math.max(1, d.total); o.isCriticalHit = crit;
        o.xpGained = combatXpReward(char.level);
      } else {
        const er = d20();
        if (er + enemy.attackBonus >= char.ac) {
          const ed = damageRoll(enemy.damageDice.count, enemy.damageDice.sides, enemy.damageBonus);
          o.hpChange = -Math.max(1, ed.total); o.damageTaken = Math.max(1, ed.total);
        }
      }
      break;
    }
    case "skill_check": {
      const ab = getSkillAbility(input);
      o.roll = abilityCheck(char.abilityScores[ab], levelScaledDC(12, char.level), ab, proficiencyBonus(char.level));
      if (o.roll.success) o.xpGained = skillXp(char.level);
      break;
    }
    case "explore": {
      o.roll = abilityCheck(char.abilityScores.wisdom, levelScaledDC(10, char.level), "wisdom", proficiencyBonus(char.level));
      if (o.roll.success) o.xpGained = exploreXp(char.level);
      break;
    }
    case "rest": {
      if (char.isUnconscious) { o.restDenied = true; break; }
      const since = char.lastRestTurn >= 0 ? gs.turnCount - char.lastRestTurn : Infinity;
      if (since < MIN_TURNS_BETWEEN_RESTS) { o.restDenied = true; break; }
      const healed = Math.max(1, Math.floor(char.maxHp * 0.25) + mod(char.abilityScores.constitution));
      o.hpChange = Math.min(healed, char.maxHp - char.hp);
      o.lastRestTurn = gs.turnCount;
      break;
    }
    case "talk": {
      o.roll = abilityCheck(char.abilityScores.charisma, levelScaledDC(11, char.level), "charisma", proficiencyBonus(char.level));
      if (o.roll.success) o.xpGained = skillXp(char.level);
      break;
    }
    case "use_item": {
      const lower = input.toLowerCase();
      const words = lower.replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
      const ignore = new Set(["use", "drink", "eat", "equip", "open", "read", "the", "my", "this", "that", "some"]);
      const terms = words.filter(w => !ignore.has(w));
      const matched = char.inventory.find(item => {
        const il = item.toLowerCase();
        if (lower.includes(il)) return true;
        return terms.some(t => il.includes(t));
      });
      if (matched) {
        const il = matched.toLowerCase();
        if (["potion", "rations", "scroll", "elixir", "antidote"].some(c => il.includes(c))) {
          o.itemsLost = [matched];
          if (il.includes("healing") || il.includes("health") || (il.includes("potion") && !il.includes("poison")))
            o.hpChange = Math.min(damageRoll(2, 4, 2).total, char.maxHp - char.hp);
          if (il.includes("poison")) o.hpChange = -damageRoll(2, 4, 0).total;
        }
      } else o.itemNotFound = true;
      break;
    }
    case "trade": case "unknown": break;
  }
  return o;
}

// ── Character ───────────────────────────────────────────────────
const HIT_DICE: Record<string, number> = {
  Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
  Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
  Sorcerer: 6, Wizard: 6,
};
function maxHpForLevel(cls: string, con: number, lvl: number) {
  const hd = HIT_DICE[cls] ?? 8; const cm = mod(con);
  return hd + cm + (lvl - 1) * (Math.floor(hd / 2) + 1 + cm);
}
function roll4d6() { return roll(4, 6).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0); }

const GEAR: Record<string, string[]> = {
  Barbarian: ["Greataxe","Handaxe","Explorer's Pack"],
  Bard: ["Rapier","Lute","Leather Armor","Diplomat's Pack"],
  Cleric: ["Mace","Shield","Scale Mail","Priest's Pack","Holy Symbol"],
  Druid: ["Wooden Shield","Scimitar","Leather Armor","Explorer's Pack","Druidic Focus"],
  Fighter: ["Longsword","Shield","Chain Mail","Dungeoneer's Pack"],
  Monk: ["Shortsword","Dungeoneer's Pack"],
  Paladin: ["Longsword","Shield","Chain Mail","Priest's Pack","Holy Symbol"],
  Ranger: ["Longbow","Quiver (20 Arrows)","Shortsword","Leather Armor","Explorer's Pack"],
  Rogue: ["Shortsword","Shortbow","Quiver (20 Arrows)","Leather Armor","Burglar's Pack","Thieves' Tools"],
  Sorcerer: ["Dagger","Arcane Focus","Dungeoneer's Pack"],
  Warlock: ["Dagger","Arcane Focus","Scholar's Pack","Leather Armor"],
  Wizard: ["Quarterstaff","Spellbook","Arcane Focus","Scholar's Pack"],
};

function createChar(name: string, gender: string, race: string, cls: string): Character {
  const sc: AbilityScores = {
    strength: roll4d6(), dexterity: roll4d6(), constitution: roll4d6(),
    wisdom: roll4d6(), intelligence: roll4d6(), charisma: roll4d6(),
  };
  const hp = Math.max(1, (HIT_DICE[cls] ?? 8) + mod(sc.constitution));
  return {
    name, gender, race, class: cls, level: 1, hp, maxHp: hp, ac: 14,
    xp: 0, xpToNextLevel: getXpToNextLevel(1), abilityScores: sc,
    inventory: ["Backpack","Waterskin","Healing Potion","Healing Potion","Healing Potion","Rations (3 days)",...(GEAR[cls]??[])],
    gold: 15, lastRestTurn: -1,
    deathSaves: { successes: 0, failures: 0 }, isUnconscious: false, isDead: false,
  };
}

function applyOutcome(c: Character, o: EngineOutcome): void {
  if (o.hpChange) c.hp = Math.max(0, Math.min(c.maxHp, c.hp + o.hpChange));
  if (c.hp <= 0 && !c.isUnconscious) { c.isUnconscious = true; c.hp = 0; c.deathSaves = { successes: 0, failures: 0 }; }
  if (c.hp > 0 && c.isUnconscious) { c.isUnconscious = false; c.deathSaves = { successes: 0, failures: 0 }; }
  if (o.deathSaveResult) {
    if (o.deathSaveResult === "nat20") c.deathSaves = { successes: 0, failures: 0 };
    else if (o.deathSaveResult === "nat1") c.deathSaves.failures = Math.min(3, c.deathSaves.failures + 2);
    else if (o.deathSaveResult === "success") c.deathSaves.successes = Math.min(3, c.deathSaves.successes + 1);
    else if (o.deathSaveResult === "failure") c.deathSaves.failures = Math.min(3, c.deathSaves.failures + 1);
    if (c.deathSaves.failures >= 3) c.isDead = true;
    if (c.deathSaves.successes >= 3) { c.deathSaves = { successes: 0, failures: 0 }; c.hp = 1; c.isUnconscious = false; }
  }
  for (const item of o.itemsLost) { const idx = c.inventory.indexOf(item); if (idx >= 0) c.inventory.splice(idx, 1); }
  for (const item of o.itemsGained) c.inventory.push(item);
  c.gold += o.goldChange;
  if (o.lastRestTurn !== undefined) c.lastRestTurn = o.lastRestTurn;
  if (o.xpGained > 0) {
    c.xp += o.xpGained;
    while (c.level < 20 && c.xp >= c.xpToNextLevel) {
      c.level++;
      c.xpToNextLevel = getXpToNextLevel(c.level);
      const newMax = maxHpForLevel(c.class, c.abilityScores.constitution, c.level);
      const inc = newMax - c.maxHp; c.maxHp = newMax;
      c.hp = Math.min(c.maxHp, c.hp + inc);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// COMBAT GAUNTLET: Heavy combat with intentional danger
// ═══════════════════════════════════════════════════════════════

// Weighted action selection for intense combat
const COMBAT_ACTIONS = [
  { action: "I attack the enemy with my weapon", weight: 30 },
  { action: "I cast fireball at the creature", weight: 15 },
  { action: "I swing my axe at the monster", weight: 15 },
  { action: "I shoot my bow at the target", weight: 10 },
  { action: "I strike the beast with all my might", weight: 10 },
  { action: "I drink my Healing Potion", weight: 5 },
  { action: "I rest at the camp", weight: 5 },
  { action: "I sneak past the guards", weight: 3 },
  { action: "I talk to the enemy", weight: 3 },
  { action: "I investigate the room", weight: 2 },
  { action: "I stab myself with my dagger", weight: 1 },
  { action: "I jump into the pit", weight: 1 },
];

function weightedRandom(): string {
  const totalWeight = COMBAT_ACTIONS.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * totalWeight;
  for (const { action, weight } of COMBAT_ACTIONS) {
    r -= weight;
    if (r <= 0) return action;
  }
  return COMBAT_ACTIONS[0].action;
}

interface BugEntry { turn: number; type: string; detail: string; }

function formatHP(c: Character): string {
  if (c.isDead) return "DEAD";
  if (c.isUnconscious) return `0/${c.maxHp} [DYING ${c.deathSaves.successes}S/${c.deathSaves.failures}F]`;
  return `${c.hp}/${c.maxHp}`;
}

function runGauntlet(char: Character, turns: number): BugEntry[] {
  const bugs: BugEntry[] = [];
  const gs = { location: "Arena", questLog: ["Survive"], turnCount: 0 };
  let combats = 0, hits = 0, crits = 0, knockdowns = 0, deaths = 0, stabilizations = 0, deathSaves = 0;
  let totalDmgDealt = 0, totalDmgTaken = 0, restOK = 0, restDenied = 0, potionsDrank = 0;

  for (let t = 0; t < turns; t++) {
    gs.turnCount = t;
    const prevLvl = char.level;
    const prevHP = char.hp;
    const prevUC = char.isUnconscious;
    const prevDead = char.isDead;

    // Resurrect on death for continued testing
    if (char.isDead) {
      deaths++;
      console.log(`  │ T${String(t).padStart(5,"0")} ☠ PERMADEATH — Resurrecting for continued testing`);
      char.isDead = false; char.isUnconscious = false; char.hp = char.maxHp;
      char.deathSaves = { successes: 0, failures: 0 };
    }

    const action = weightedRandom();
    const detectedAction = detectAction(action, char);
    const outcome = resolveAction(action, char, gs);

    // Bug checks
    if (outcome.hpChange > 0 && char.hp + outcome.hpChange > char.maxHp) {
      bugs.push({ turn: t, type: "HEAL_OVERFLOW", detail: `+${outcome.hpChange} from ${char.hp}/${char.maxHp}` });
    }
    if (outcome.damageDealt !== undefined && outcome.damageDealt <= 0) {
      bugs.push({ turn: t, type: "ZERO_DAMAGE", detail: `${outcome.damageDealt}` });
    }
    if (/\b(talk|speak|ask|greet)\b/i.test(action) && outcome.roll && outcome.roll.ability !== "charisma" && outcome.roll.ability !== "death") {
      bugs.push({ turn: t, type: "TALK_WRONG_ABILITY", detail: `${outcome.roll.ability}` });
    }
    if (/\b(?:rest|sleep|camp)\b/i.test(action) && !outcome.restDenied && outcome.hpChange === 0 && char.hp < char.maxHp && !char.isUnconscious) {
      bugs.push({ turn: t, type: "REST_HEALS_ZERO", detail: `hp ${char.hp}/${char.maxHp}` });
    }

    // Apply
    applyOutcome(char, outcome);

    if (char.hp > char.maxHp) bugs.push({ turn: t, type: "HP_EXCEEDS_MAX", detail: `${char.hp}/${char.maxHp}` });
    if (char.hp < 0) bugs.push({ turn: t, type: "NEGATIVE_HP", detail: `${char.hp}` });

    // Track stats
    if (outcome.roll?.type === "attack") { combats++; if (outcome.roll.success) hits++; }
    if (outcome.isCriticalHit) crits++;
    if (outcome.damageDealt) totalDmgDealt += outcome.damageDealt;
    if (outcome.damageTaken) totalDmgTaken += outcome.damageTaken;
    if (outcome.deathSaveResult) deathSaves++;
    if (outcome.itemsLost.some(i => i.toLowerCase().includes("potion"))) potionsDrank++;

    // Print only interesting events
    const isInteresting =
      char.isUnconscious !== prevUC ||
      char.isDead !== prevDead ||
      char.level > prevLvl ||
      outcome.isCriticalHit ||
      outcome.deathSaveResult !== undefined ||
      (outcome.damageTaken && outcome.damageTaken >= char.maxHp * 0.4) ||
      outcome.restDenied ||
      (outcome.hpChange > 0 && outcome.itemsLost.length > 0) ||
      (/self_harm/i.test(detectedAction));

    if (isInteresting) {
      let line = `  │ T${String(t).padStart(5,"0")} [${detectedAction.toUpperCase().padEnd(11)}] `;
      const parts: string[] = [];

      if (outcome.roll) {
        if (outcome.roll.type === "attack") {
          parts.push(`d20(${outcome.roll.rolled})+${outcome.roll.modifier}=${outcome.roll.total} vs AC${outcome.roll.dc} ${outcome.roll.success?"HIT":"MISS"}`);
        } else if (outcome.roll.ability === "death") {
          parts.push(`Death Save d20(${outcome.roll.rolled}) ${outcome.roll.rolled===20?"NAT20!":outcome.roll.rolled===1?"NAT1!":outcome.roll.success?"OK":"FAIL"}`);
        } else {
          parts.push(`${outcome.roll.ability} d20(${outcome.roll.rolled})+${outcome.roll.modifier}=${outcome.roll.total} vs DC${outcome.roll.dc}`);
        }
      }
      if (outcome.isCriticalHit) parts.push(`CRIT! ${outcome.damageDealt}dmg`);
      else if (outcome.damageDealt) parts.push(`${outcome.damageDealt}dmg dealt`);
      if (outcome.damageTaken) parts.push(`took ${outcome.damageTaken}dmg`);
      if (outcome.hpChange > 0 && !outcome.deathSaveResult) parts.push(`healed ${outcome.hpChange}`);
      if (outcome.hpChange < 0 && !outcome.damageTaken) parts.push(`lost ${Math.abs(outcome.hpChange)}HP`);
      if (outcome.restDenied) parts.push("REST DENIED");
      if (outcome.deathSaveResult) {
        const labels: Record<string, string> = { nat20:"NAT20 regain 1HP!", nat1:"NAT1 = 2 failures!", success:"save OK", failure:"save FAIL" };
        parts.push(labels[outcome.deathSaveResult]);
      }
      if (outcome.itemsLost.length > 0) parts.push(`used ${outcome.itemsLost[0]}`);

      line += parts.join(" | ");
      console.log(line);

      if (char.isUnconscious && !prevUC) {
        knockdowns++;
        console.log(`  │         ⚠ KNOCKED OUT! HP: ${formatHP(char)}`);
      }
      if (!char.isUnconscious && prevUC && !char.isDead) {
        stabilizations++;
        console.log(`  │         ✦ STABILIZED! HP: ${formatHP(char)}`);
      }
      if (char.isDead && !prevDead) {
        console.log(`  │         ☠ DEAD! ${char.deathSaves.failures} failures`);
      }
      if (char.level > prevLvl) {
        console.log(`  │         ★ LEVEL ${prevLvl}→${char.level} | HP ${prevHP}→${char.hp}/${char.maxHp} | XP ${char.xp}`);
      }

      if (!outcome.isCriticalHit && !outcome.deathSaveResult && char.level === prevLvl && !outcome.restDenied) {
        // Show HP bar for damage/heal events
        const pct = char.maxHp > 0 ? Math.round((char.hp / char.maxHp) * 20) : 0;
        const bar = "█".repeat(pct) + "░".repeat(20 - pct);
        console.log(`  │         HP [${bar}] ${formatHP(char)}`);
      }
    }

    if (/\b(?:rest|sleep|camp)\b/i.test(action) && !outcome.restDenied) restOK++;
    if (outcome.restDenied) restDenied++;
  }

  console.log(`  └─── GAUNTLET COMPLETE\n`);
  console.log(`  Final: L${char.level} | HP ${formatHP(char)} | XP ${char.xp}/${char.xpToNextLevel}`);
  console.log(`  Combat: ${combats} fights | ${combats > 0 ? (hits/combats*100).toFixed(1) : "N/A"}% hit | ${crits} crits`);
  console.log(`  Damage: ${totalDmgDealt} dealt / ${totalDmgTaken} taken`);
  console.log(`  Survival: ${knockdowns} knockdowns | ${deaths} deaths | ${stabilizations} stabilizations | ${deathSaves} death saves`);
  console.log(`  Recovery: ${restOK} rests OK | ${restDenied} denied | ${potionsDrank} potions`);
  console.log(`  Bugs: ${bugs.length}`);

  return bugs;
}

// ═══════════════════════════════════════════════════════════════
// RUN THE GAUNTLET
// ═══════════════════════════════════════════════════════════════

const GAUNTLET_CHARS = [
  { name: "Korgath the Fragile", gender: "Male", race: "Halfling", cls: "Wizard" },     // Low HP, will die often
  { name: "Ironhide", gender: "Female", race: "Dwarf", cls: "Barbarian" },              // Tanky, should survive
  { name: "Shadowstep", gender: "Male", race: "Elf", cls: "Rogue" },                    // Mid-range
  { name: "Zara Brightflame", gender: "Female", race: "Tiefling", cls: "Sorcerer" },    // Spell caster, fragile
  { name: "Sir Galahad", gender: "Male", race: "Human", cls: "Paladin" },               // Tank + heals
  { name: "Willow Thornweaver", gender: "Female", race: "Half-Elf", cls: "Druid" },     // Nature caster
  { name: "Vex Nightblade", gender: "Male", race: "Dragonborn", cls: "Warlock" },       // Mid-range caster
  { name: "Sister Mercy", gender: "Female", race: "Gnome", cls: "Cleric" },             // Healer
];

const TURNS_PER_CHAR = 5000;

console.log("═══════════════════════════════════════════════════════════════");
console.log("  COMBAT GAUNTLET — Intense Battle Stress Test");
console.log(`  ${GAUNTLET_CHARS.length} characters × ${TURNS_PER_CHAR} turns each`);
console.log("═══════════════════════════════════════════════════════════════");

let grandBugs = 0;
const summary: { name: string; cls: string; level: number; deaths: number; knockdowns: string; bugs: number }[] = [];

for (const pc of GAUNTLET_CHARS) {
  const char = createChar(pc.name, pc.gender, pc.race, pc.cls);
  console.log(`\n${"━".repeat(65)}`);
  console.log(`  ${pc.name} — ${pc.gender} ${pc.race} ${pc.cls}`);
  console.log(`  STR ${char.abilityScores.strength} DEX ${char.abilityScores.dexterity} CON ${char.abilityScores.constitution} INT ${char.abilityScores.intelligence} WIS ${char.abilityScores.wisdom} CHA ${char.abilityScores.charisma}`);
  console.log(`  HP ${char.hp}/${char.maxHp} | AC ${char.ac} | Prof +${proficiencyBonus(char.level)}`);
  console.log(`  ┌─── ENTERING THE ARENA\n`);

  const bugs = runGauntlet(char, TURNS_PER_CHAR);
  grandBugs += bugs.length;

  // Extract stats from output (they're already printed by runGauntlet)
  if (bugs.length > 0) {
    console.log(`\n  ⚠ BUGS:`);
    const bt = new Map<string, number>();
    for (const b of bugs) bt.set(b.type, (bt.get(b.type) ?? 0) + 1);
    for (const [t, c] of bt) console.log(`    ${t} ×${c}`);
  }
}

console.log(`\n${"═".repeat(65)}`);
console.log(`  GRAND TOTAL BUGS: ${grandBugs}`);
console.log(`${"═".repeat(65)}`);
