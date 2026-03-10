"use client";

import { useState } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { getAlignment, ALIGNMENT_LABELS } from "@/lib/karma";
import type { CharacterClass } from "@/types/character";
import { cn } from "@/lib/utils";
import { KarmaHistory } from "./karma-history";
import { getItemInfo, getItemIcon } from "@/lib/items";

interface Props {
  onClose: () => void;
}

// ── D&D 5e saving throw proficiencies by class ──────────────────

const SAVE_PROFICIENCIES: Record<CharacterClass, string[]> = {
  Barbarian: ["STR", "CON"],
  Bard: ["DEX", "CHA"],
  Cleric: ["WIS", "CHA"],
  Druid: ["INT", "WIS"],
  Fighter: ["STR", "CON"],
  Monk: ["STR", "DEX"],
  Paladin: ["WIS", "CHA"],
  Ranger: ["STR", "DEX"],
  Rogue: ["DEX", "INT"],
  Sorcerer: ["CON", "CHA"],
  Warlock: ["WIS", "CHA"],
  Wizard: ["INT", "WIS"],
};

// ── D&D 5e skills and their governing ability ───────────────────

const SKILLS: [string, string][] = [
  ["Acrobatics", "DEX"],
  ["Animal Handling", "WIS"],
  ["Arcana", "INT"],
  ["Athletics", "STR"],
  ["Deception", "CHA"],
  ["History", "INT"],
  ["Insight", "WIS"],
  ["Intimidation", "CHA"],
  ["Investigation", "INT"],
  ["Medicine", "WIS"],
  ["Nature", "INT"],
  ["Perception", "WIS"],
  ["Performance", "CHA"],
  ["Persuasion", "CHA"],
  ["Religion", "INT"],
  ["Sleight of Hand", "DEX"],
  ["Stealth", "DEX"],
  ["Survival", "WIS"],
];

// ── Hit dice by class ───────────────────────────────────────────

const HIT_DICE: Record<CharacterClass, string> = {
  Barbarian: "d12",
  Fighter: "d10",
  Paladin: "d10",
  Ranger: "d10",
  Bard: "d8",
  Cleric: "d8",
  Druid: "d8",
  Monk: "d8",
  Rogue: "d8",
  Warlock: "d8",
  Sorcerer: "d6",
  Wizard: "d6",
};

// ── Racial speed ────────────────────────────────────────────────

const RACIAL_SPEED: Record<string, number> = {
  Human: 30, Elf: 30, Dwarf: 25, Halfling: 25, Gnome: 25,
  "Half-Elf": 30, "Half-Orc": 30, Tiefling: 30, Dragonborn: 30,
};

// ── Racial traits ───────────────────────────────────────────────

const RACIAL_TRAITS: Record<string, string[]> = {
  Human: ["Extra Language"],
  Elf: ["Darkvision (60 ft)", "Fey Ancestry", "Trance"],
  Dwarf: ["Darkvision (60 ft)", "Dwarven Resilience", "Stonecunning"],
  Halfling: ["Lucky", "Brave", "Halfling Nimbleness"],
  Gnome: ["Darkvision (60 ft)", "Gnome Cunning"],
  "Half-Elf": ["Darkvision (60 ft)", "Fey Ancestry", "Skill Versatility"],
  "Half-Orc": ["Darkvision (60 ft)", "Relentless Endurance", "Savage Attacks"],
  Tiefling: ["Darkvision (60 ft)", "Hellish Resistance", "Infernal Legacy"],
  Dragonborn: ["Breath Weapon", "Damage Resistance"],
};

// ── Weapon categorization for attacks table ─────────────────────

const WEAPON_DATA: Record<string, { damage: string; type: string }> = {
  greataxe: { damage: "1d12", type: "slashing" },
  handaxe: { damage: "1d6", type: "slashing" },
  battleaxe: { damage: "1d8", type: "slashing" },
  rapier: { damage: "1d8", type: "piercing" },
  longsword: { damage: "1d8", type: "slashing" },
  shortsword: { damage: "1d6", type: "piercing" },
  greatsword: { damage: "2d6", type: "slashing" },
  mace: { damage: "1d6", type: "bludgeoning" },
  scimitar: { damage: "1d6", type: "slashing" },
  dagger: { damage: "1d4", type: "piercing" },
  quarterstaff: { damage: "1d6", type: "bludgeoning" },
  longbow: { damage: "1d8", type: "piercing" },
  shortbow: { damage: "1d6", type: "piercing" },
  spear: { damage: "1d6", type: "piercing" },
  javelin: { damage: "1d6", type: "piercing" },
  crossbow: { damage: "1d8", type: "piercing" },
  trident: { damage: "1d6", type: "piercing" },
  warhammer: { damage: "1d8", type: "bludgeoning" },
  flail: { damage: "1d8", type: "bludgeoning" },
  morningstar: { damage: "1d8", type: "piercing" },
  maul: { damage: "2d6", type: "bludgeoning" },
  halberd: { damage: "1d10", type: "slashing" },
  pike: { damage: "1d10", type: "piercing" },
  glaive: { damage: "1d10", type: "slashing" },
  lance: { damage: "1d12", type: "piercing" },
  whip: { damage: "1d4", type: "slashing" },
};

function getWeaponInfo(itemName: string): { damage: string; type: string } | null {
  const lower = itemName.toLowerCase();
  for (const [weapon, info] of Object.entries(WEAPON_DATA)) {
    if (lower.includes(weapon)) return info;
  }
  return null;
}

// ── Finesse / ranged weapons use DEX ────────────────────────────

const FINESSE_WEAPONS = ["rapier", "shortsword", "dagger", "scimitar", "whip"];
const RANGED_WEAPONS = ["longbow", "shortbow", "crossbow"];

function useDexForAttack(itemName: string): boolean {
  const lower = itemName.toLowerCase();
  return FINESSE_WEAPONS.some((w) => lower.includes(w)) || RANGED_WEAPONS.some((w) => lower.includes(w));
}

export function CharacterSheet({ onClose }: Props) {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();
  const { karmaHistory } = useKarmaStore();
  const [showKarmaHistory, setShowKarmaHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const equippedItems = character.equipped ?? [];
  const backpackItems = character.inventory.filter((item) => !equippedItems.includes(item));

  const alignment = getAlignment(character.karma);
  const alignmentLabel = ALIGNMENT_LABELS[alignment];

  const abilityMod = (score: number) => Math.floor((score - 10) / 2);
  const fmtMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`);

  const profBonus = Math.floor((character.level - 1) / 4) + 2;
  const speed = RACIAL_SPEED[character.race] ?? 30;
  const hitDie = HIT_DICE[character.class] ?? "d8";
  const initiative = abilityMod(character.abilityScores.dexterity);
  const passivePerception = 10 + abilityMod(character.abilityScores.wisdom);
  const racialTraits = RACIAL_TRAITS[character.race] ?? [];

  const abilityMap: Record<string, number> = {
    STR: character.abilityScores.strength,
    DEX: character.abilityScores.dexterity,
    CON: character.abilityScores.constitution,
    INT: character.abilityScores.intelligence,
    WIS: character.abilityScores.wisdom,
    CHA: character.abilityScores.charisma,
  };

  const classSaves = SAVE_PROFICIENCIES[character.class] ?? [];

  // Find weapons in inventory for attacks table
  const weapons = character.inventory
    .map((item) => {
      const info = getWeaponInfo(item);
      if (!info) return null;
      const usesDex = useDexForAttack(item);
      const atkAbility = usesDex ? character.abilityScores.dexterity : character.abilityScores.strength;
      const atkMod = abilityMod(atkAbility) + profBonus;
      const dmgMod = abilityMod(atkAbility);
      return { name: item, atkBonus: fmtMod(atkMod), damage: `${info.damage}${dmgMod >= 0 ? "+" : ""}${dmgMod}`, type: info.type };
    })
    .filter(Boolean) as { name: string; atkBonus: string; damage: string; type: string }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] max-w-3xl h-[88vh] bg-card border border-border rounded-xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-muted-foreground hover:text-foreground text-2xl leading-none z-10"
        >
          &times;
        </button>

        {/* ═══ HEADER BAR (mirrors top of official sheet) ═══ */}
        <div className="px-6 pt-5 pb-3 border-b border-border/50 bg-gradient-to-b from-muted/60 to-transparent">
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{character.name}</h2>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-0.5">
              <div><span className="font-semibold text-foreground">{character.class} {character.level}</span></div>
              <div>{character.race} ({character.gender})</div>
              <div>{alignmentLabel}</div>
              <div>XP: {character.xp}{character.xpToNextLevel !== Infinity ? ` / ${character.xpToNextLevel}` : " (MAX)"}</div>
            </div>
          </div>
        </div>

        {/* ═══ THREE-COLUMN LAYOUT (mirrors official sheet) ═══ */}
        <div className="grid grid-cols-[140px_1fr_180px] gap-4 p-4">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-2">

            {/* Ability Scores — compact vertical stack */}
            {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => {
              const val = abilityMap[ab];
              const m = abilityMod(val);
              return (
                <div key={ab} className="flex items-center justify-between bg-muted/40 rounded px-2.5 py-1.5 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-8">{ab}</span>
                  <span className="text-lg font-black leading-none">{fmtMod(m)}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-1.5">{val}</span>
                </div>
              );
            })}

            {/* Proficiency Bonus & Inspiration row */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="text-center bg-muted/40 rounded py-1.5 border border-border/40">
                <div className="text-[9px] text-muted-foreground uppercase">Prof</div>
                <div className="text-sm font-black">+{profBonus}</div>
              </div>
              <div className="text-center bg-muted/30 rounded py-1.5 border border-border/20">
                <div className="text-[9px] text-muted-foreground uppercase">Insp</div>
                <div className="text-sm">&#x25CB;</div>
              </div>
            </div>

            {/* Saving Throws */}
            <div className="bg-muted/30 rounded-lg p-2 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 text-center">Saving Throws</div>
              {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => {
                const val = abilityMap[ab];
                const isProficient = classSaves.includes(ab);
                const saveMod = abilityMod(val) + (isProficient ? profBonus : 0);
                return (
                  <div key={ab} className="flex items-center gap-1.5 text-xs py-0.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full border flex-shrink-0",
                      isProficient ? "bg-primary border-primary" : "border-muted-foreground/40"
                    )} />
                    <span className="font-mono w-7 text-right font-semibold">{fmtMod(saveMod)}</span>
                    <span className="text-muted-foreground">{ab}</span>
                  </div>
                );
              })}
            </div>

            {/* Passive Perception */}
            <div className="text-center bg-muted/40 rounded py-1.5 border border-border/40">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Passive Perception</div>
              <div className="text-sm font-black">{passivePerception}</div>
            </div>
          </div>

          {/* ── CENTER COLUMN ── */}
          <div className="space-y-4">

            {/* AC / Initiative / Speed row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-muted/40 rounded-lg py-3 border-2 border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Armor Class</div>
                <div className="text-3xl font-black">{character.ac}</div>
              </div>
              <div className="text-center bg-muted/40 rounded-lg py-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Initiative</div>
                <div className="text-3xl font-black">{fmtMod(initiative)}</div>
              </div>
              <div className="text-center bg-muted/40 rounded-lg py-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Speed</div>
                <div className="text-3xl font-black">{speed}</div>
                <div className="text-[10px] text-muted-foreground">ft</div>
              </div>
            </div>

            {/* Hit Points */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Hit Points</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-muted-foreground">Maximum</div>
                  <div className="text-2xl font-black text-red-400">{character.maxHp}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Current</div>
                  <div className={cn(
                    "text-2xl font-black",
                    character.hp > character.maxHp * 0.5 ? "text-emerald-400" :
                    character.hp > character.maxHp * 0.25 ? "text-orange-400" :
                    "text-red-400"
                  )}>
                    {character.hp}
                  </div>
                </div>
              </div>
              {/* HP Bar */}
              <div className="w-full bg-red-950/80 rounded-full h-2.5 overflow-hidden border border-red-900/50 mt-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    character.hp > character.maxHp * 0.6 ? "bg-red-500" :
                    character.hp > character.maxHp * 0.25 ? "bg-orange-500" : "bg-red-700"
                  )}
                  style={{ width: `${Math.round((character.hp / character.maxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Hit Dice & Death Saves row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hit Dice</div>
                <div className="text-lg font-black">{character.level}{hitDie}</div>
                <div className="text-[10px] text-muted-foreground">Total: {character.level}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Death Saves</div>
                <div className="flex gap-3">
                  <div>
                    <span className="text-[10px] text-emerald-400">S </span>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={cn(
                        "inline-block w-3 h-3 rounded-full border mr-0.5",
                        i < character.deathSaves.successes ? "bg-emerald-500 border-emerald-400" : "border-muted-foreground/40"
                      )} />
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] text-red-400">F </span>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={cn(
                        "inline-block w-3 h-3 rounded-full border mr-0.5",
                        i < character.deathSaves.failures ? "bg-red-500 border-red-400" : "border-muted-foreground/40"
                      )} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Attacks & Spellcasting */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Attacks & Spellcasting</div>
              {weapons.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-muted-foreground uppercase">
                      <th className="text-left font-medium pb-1">Name</th>
                      <th className="text-center font-medium pb-1">Atk Bonus</th>
                      <th className="text-right font-medium pb-1">Damage/Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.slice(0, 5).map((w) => (
                      <tr key={w.name} className="border-t border-border/20">
                        <td className="py-1 truncate max-w-[120px]">{w.name}</td>
                        <td className="py-1 text-center font-mono font-semibold">{w.atkBonus}</td>
                        <td className="py-1 text-right font-mono">{w.damage} {w.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-xs text-muted-foreground italic">No weapons equipped</div>
              )}
            </div>

            {/* Equipment — Worn */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Worn Equipment</div>
              {equippedItems.length > 0 ? (
                <ul className="space-y-1">
                  {equippedItems.map((item) => {
                    const info = getItemInfo(item);
                    const icon = getItemIcon(item);
                    const isIdentified = !info?.isMagical || character.identifiedItems.includes(item);
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(selectedItem === item ? null : item)}
                          className={cn(
                            "w-full text-left flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border transition-colors",
                            info?.isMagical
                              ? "bg-purple-950/30 border-purple-700/30 hover:bg-purple-950/50"
                              : "bg-muted/20 border-border/10 hover:bg-muted/40",
                            selectedItem === item && "ring-1 ring-primary"
                          )}
                        >
                          <span className="text-sm shrink-0">{icon}</span>
                          <span className="truncate">{item}</span>
                          {info?.isMagical && !isIdentified && (
                            <span className="text-[9px] text-purple-400 shrink-0">???</span>
                          )}
                        </button>
                        {selectedItem === item && (
                          <div className="mt-1 mx-1 p-2 bg-muted/40 rounded text-[10px] text-muted-foreground border border-border/20">
                            <div>{info?.description ?? "A mysterious item."}</div>
                            {info?.isMagical && isIdentified && info.magicalProperties && (
                              <div className="mt-1 text-purple-300 font-semibold">{info.magicalProperties}</div>
                            )}
                            {info?.isMagical && !isIdentified && (
                              <div className="mt-1 text-purple-400 italic">Magical properties unknown. Requires identification.</div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground italic">Nothing equipped</div>
              )}
            </div>

            {/* Backpack / Inventory */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Backpack</div>
                <div className="text-[10px] text-amber-400 font-bold">{character.gold} GP</div>
              </div>
              {backpackItems.length > 0 ? (
                <ul className="space-y-1">
                  {backpackItems.map((item) => {
                    const info = getItemInfo(item);
                    const icon = getItemIcon(item);
                    const isIdentified = !info?.isMagical || character.identifiedItems.includes(item);
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(selectedItem === item ? null : item)}
                          className={cn(
                            "w-full text-left flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border transition-colors",
                            info?.isMagical
                              ? "bg-purple-950/30 border-purple-700/30 hover:bg-purple-950/50"
                              : "bg-muted/20 border-border/10 hover:bg-muted/40",
                            selectedItem === item && "ring-1 ring-primary"
                          )}
                        >
                          <span className="text-sm shrink-0">{icon}</span>
                          <span className="truncate">{item}</span>
                          {info?.isMagical && !isIdentified && (
                            <span className="text-[9px] text-purple-400 shrink-0">???</span>
                          )}
                        </button>
                        {selectedItem === item && (
                          <div className="mt-1 mx-1 p-2 bg-muted/40 rounded text-[10px] text-muted-foreground border border-border/20">
                            <div>{info?.description ?? "A mysterious item."}</div>
                            {info?.isMagical && isIdentified && info.magicalProperties && (
                              <div className="mt-1 text-purple-300 font-semibold">{info.magicalProperties}</div>
                            )}
                            {info?.isMagical && !isIdentified && (
                              <div className="mt-1 text-purple-400 italic">Magical properties unknown. Requires identification.</div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground italic">Empty</div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">

            {/* Alignment / Karma — clickable to show history */}
            <button
              type="button"
              onClick={() => setShowKarmaHistory(true)}
              className="w-full text-left bg-muted/30 rounded-lg p-3 border border-border/30 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Alignment</div>
              <div className={cn(
                "text-sm font-bold",
                character.karma > 25 ? "text-emerald-400" :
                character.karma < -25 ? "text-red-400" :
                "text-gray-400"
              )}>
                {alignmentLabel}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Karma: {character.karma > 0 ? "+" : ""}{character.karma}
              </div>
              {karmaHistory.length > 0 && (
                <div className="text-[10px] text-muted-foreground underline">
                  {karmaHistory.length} moral action{karmaHistory.length > 1 ? "s" : ""} — view history
                </div>
              )}
            </button>

            {/* Racial Traits & Features */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Features & Traits</div>
              <div className="text-[10px] text-muted-foreground uppercase mb-1">{character.race} Traits</div>
              <ul className="space-y-0.5 mb-3">
                {racialTraits.map((trait) => (
                  <li key={trait} className="text-[11px]">{trait}</li>
                ))}
              </ul>
              <div className="text-[10px] text-muted-foreground uppercase mb-1">{character.class} Features</div>
              <ul className="space-y-0.5">
                <li className="text-[11px]">Hit Die: {hitDie}</li>
                <li className="text-[11px]">Save Prof: {classSaves.join(", ")}</li>
              </ul>
            </div>

            {/* Location */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Location</div>
              <div className="text-xs font-medium flex items-center gap-1.5">
                <span className="text-green-400">&#x25CF;</span>
                {location}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-muted/30 rounded-lg p-2 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 text-center">Skills</div>
              {SKILLS.map(([skill, ability]) => {
                const val = abilityMap[ability];
                const skillMod = abilityMod(val);
                return (
                  <div key={skill} className="flex items-center gap-1.5 text-[11px] py-0.5">
                    <span className="w-2 h-2 rounded-full border border-muted-foreground/40 flex-shrink-0" />
                    <span className="font-mono w-6 text-right font-semibold">{fmtMod(skillMod)}</span>
                    <span className="text-muted-foreground truncate">
                      {skill} <span className="text-[9px]">({ability})</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quest Log */}
            {questLog.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Quest Log</div>
                <ul className="space-y-1">
                  {questLog.map((q) => (
                    <li key={q} className="text-[11px] text-amber-300/80">
                      &#x2694; {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unconscious warning */}
            {character.isUnconscious && (
              <div className="bg-red-950/60 rounded-lg p-3 border border-red-700/50 animate-pulse">
                <div className="text-[10px] text-red-400 uppercase tracking-wider font-bold text-center">
                  Unconscious
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Karma History sub-modal */}
        {showKarmaHistory && (
          <KarmaHistory
            karma={character.karma}
            history={karmaHistory}
            onClose={() => setShowKarmaHistory(false)}
          />
        )}
      </div>
    </div>
  );
}
