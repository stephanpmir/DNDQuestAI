"use client";

import { useState } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { getAlignment, ALIGNMENT_LABELS } from "@/lib/karma";
import type { CharacterClass } from "@/types/character";
import { cn } from "@/lib/utils";
import { KarmaHistory } from "./karma-history";
import { FameHistory } from "./fame-history";
import { getItemInfo, getItemIcon } from "@/lib/items";

interface Props {
  onClose: () => void;
}

// ── Color palette ─────────────────────────────────────────────

const C = {
  bg: "#0a0a0a",
  sectionBg: "#110800",
  statBg: "#1a0a00",
  rowOdd: "#0d0d0d",
  rowEven: "#130800",
  gold: "#c9a227",
  goldMuted: "#a07830",
  goldBorder: "rgba(201,162,39,0.3)",
  goldBorderStrong: "rgba(201,162,39,0.5)",
  crimson: "#8b0000",
  crimsonBorder: "rgba(139,0,0,0.4)",
  parchment: "#e8d5b0",
  parchmentMuted: "rgba(232,213,176,0.6)",
  purple: "#a855f7",
  purpleMuted: "rgba(168,85,247,0.25)",
};

/** Cinzel-like font stack (Cinzel loaded via Google Fonts or fallback to serif) */
const headerFont = "'Cinzel', 'Palatino Linotype', 'Book Antiqua', serif";
const bodyFont = "'Georgia', 'Palatino Linotype', serif";

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

// ── Shared style helpers ────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: C.sectionBg,
  border: `1px solid ${C.goldBorder}`,
  borderRadius: 8,
  padding: 12,
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: headerFont,
  fontVariant: "small-caps",
  letterSpacing: "0.12em",
  color: C.gold,
  textTransform: "uppercase",
  marginBottom: 6,
  textAlign: "center",
};

function ProfDot({ filled }: { filled: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        border: `1.5px solid ${filled ? C.gold : C.goldMuted}`,
        backgroundColor: filled ? C.gold : "transparent",
        flexShrink: 0,
      }}
    />
  );
}

// ── Main component ──────────────────────────────────────────────

export function CharacterSheet({ onClose }: Props) {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();
  const { karmaHistory, fameHistory } = useKarmaStore();
  const [showKarmaHistory, setShowKarmaHistory] = useState(false);
  const [showFameHistory, setShowFameHistory] = useState(false);
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

  const hpPercent = Math.round((character.hp / character.maxHp) * 100);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "92vw",
          maxWidth: 768,
          height: "88vh",
          background: C.bg,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 12,
          boxShadow: `0 0 60px rgba(201,162,39,0.08), inset 0 1px 0 rgba(201,162,39,0.1)`,
          overflowY: "auto",
          color: C.parchment,
          fontFamily: bodyFont,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            fontSize: 24,
            lineHeight: 1,
            color: C.crimson,
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.crimson)}
        >
          &times;
        </button>

        {/* ═══ HEADER BAR ═══ */}
        <div style={{ padding: "20px 24px 12px", borderBottom: `1px solid ${C.crimsonBorder}`, background: "linear-gradient(180deg, rgba(26,10,0,0.8) 0%, transparent 100%)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, fontFamily: headerFont, color: C.gold, letterSpacing: "0.04em", margin: 0 }}>
                {character.name}
              </h2>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: C.goldMuted, lineHeight: 1.6 }}>
              <div><span style={{ fontWeight: 700, color: C.parchment, fontFamily: headerFont }}>{character.class} {character.level}</span></div>
              <div>{character.race} ({character.gender})</div>
              <div>{alignmentLabel}</div>
              <div style={{ color: C.gold }}>XP: {character.xp}{character.xpToNextLevel !== Infinity ? ` / ${character.xpToNextLevel}` : " (MAX)"}</div>
            </div>
          </div>
        </div>

        {/* ═══ THREE-COLUMN LAYOUT ═══ */}
        <div className="grid grid-cols-[140px_1fr_180px] gap-4 p-4">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-2">

            {/* Ability Scores */}
            {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => {
              const val = abilityMap[ab];
              const m = abilityMod(val);
              return (
                <div key={ab} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.statBg, borderRadius: 4, padding: "6px 10px", border: `1px solid ${C.goldBorder}` }}>
                  <span style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", width: 32 }}>{ab}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: C.gold, fontFamily: headerFont, lineHeight: 1 }}>{fmtMod(m)}</span>
                  <span style={{ fontSize: 10, color: C.parchmentMuted, background: "rgba(201,162,39,0.08)", borderRadius: 10, padding: "1px 6px" }}>{val}</span>
                </div>
              );
            })}

            {/* Proficiency Bonus & Inspiration */}
            <div className="grid grid-cols-2 gap-1.5">
              <div style={{ textAlign: "center", background: C.statBg, borderRadius: 4, padding: "6px 0", border: `1px solid ${C.goldBorder}` }}>
                <div style={{ fontSize: 9, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Prof</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.gold, fontFamily: headerFont }}>+{profBonus}</div>
              </div>
              <div style={{ textAlign: "center", background: C.statBg, borderRadius: 4, padding: "6px 0", border: `1px solid ${C.goldBorder}` }}>
                <div style={{ fontSize: 9, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Insp</div>
                <div style={{ fontSize: 14, color: C.parchmentMuted }}>&#x25CB;</div>
              </div>
            </div>

            {/* Saving Throws */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Saving Throws</div>
              {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((ab) => {
                const val = abilityMap[ab];
                const isProficient = classSaves.includes(ab);
                const saveMod = abilityMod(val) + (isProficient ? profBonus : 0);
                return (
                  <div key={ab} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "2px 0" }}>
                    <ProfDot filled={isProficient} />
                    <span style={{ fontFamily: "monospace", width: 28, textAlign: "right", fontWeight: 600, color: C.parchment }}>{fmtMod(saveMod)}</span>
                    <span style={{ color: C.goldMuted }}>{ab}</span>
                  </div>
                );
              })}
            </div>

            {/* Passive Perception */}
            <div style={{ textAlign: "center", background: C.statBg, borderRadius: 4, padding: "6px 0", border: `1px solid ${C.goldBorder}` }}>
              <div style={{ fontSize: 9, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Passive Perception</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{passivePerception}</div>
            </div>
          </div>

          {/* ── CENTER COLUMN ── */}
          <div className="space-y-4">

            {/* AC / Initiative / Speed row */}
            <div className="grid grid-cols-3 gap-3">
              <div style={{ textAlign: "center", background: C.sectionBg, borderRadius: 8, padding: "12px 0", border: `2px solid ${C.goldBorderStrong}` }}>
                <div style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Armor Class</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: C.gold, fontFamily: headerFont }}>{character.ac}</div>
              </div>
              <div style={{ textAlign: "center", background: C.sectionBg, borderRadius: 8, padding: "12px 0", border: `1px solid ${C.goldBorder}` }}>
                <div style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Initiative</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{fmtMod(initiative)}</div>
              </div>
              <div style={{ textAlign: "center", background: C.sectionBg, borderRadius: 8, padding: "12px 0", border: `1px solid ${C.goldBorder}` }}>
                <div style={{ fontSize: 10, color: C.goldMuted, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em" }}>Speed</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{speed}</div>
                <div style={{ fontSize: 10, color: C.goldMuted }}>ft</div>
              </div>
            </div>

            {/* Hit Points */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Hit Points</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={{ fontSize: 10, color: C.goldMuted }}>Maximum</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#dc2626", fontFamily: headerFont }}>{character.maxHp}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.goldMuted }}>Current</div>
                  <div style={{
                    fontSize: 22, fontWeight: 900, fontFamily: headerFont,
                    color: character.hp > character.maxHp * 0.5 ? "#22c55e" : character.hp > character.maxHp * 0.25 ? "#f97316" : "#dc2626",
                  }}>
                    {character.hp}
                  </div>
                </div>
              </div>
              {/* HP Bar */}
              <div style={{ width: "100%", background: "rgba(139,0,0,0.3)", borderRadius: 6, height: 10, overflow: "hidden", border: `1px solid ${C.crimsonBorder}`, marginTop: 8 }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 6,
                    transition: "width 0.5s",
                    width: `${hpPercent}%`,
                    background: hpPercent > 60 ? "linear-gradient(90deg, #8b0000, #dc2626)" : hpPercent > 25 ? "linear-gradient(90deg, #8b0000, #f97316)" : "#8b0000",
                  }}
                />
              </div>
            </div>

            {/* Hit Dice & Death Saves */}
            <div className="grid grid-cols-2 gap-3">
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Hit Dice</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.parchment, fontFamily: headerFont }}>{character.level}{hitDie}</div>
                <div style={{ fontSize: 10, color: C.goldMuted }}>Total: {character.level}</div>
              </div>
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Death Saves</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 10, color: "#22c55e" }}>S </span>
                    {[0, 1, 2].map((i) => (
                      <span key={i} style={{
                        display: "inline-block", width: 12, height: 12, borderRadius: "50%", marginRight: 2,
                        border: `1.5px solid ${i < character.deathSaves.successes ? "#22c55e" : C.goldMuted}`,
                        backgroundColor: i < character.deathSaves.successes ? "#22c55e" : "transparent",
                      }} />
                    ))}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: "#dc2626" }}>F </span>
                    {[0, 1, 2].map((i) => (
                      <span key={i} style={{
                        display: "inline-block", width: 12, height: 12, borderRadius: "50%", marginRight: 2,
                        border: `1.5px solid ${i < character.deathSaves.failures ? "#dc2626" : C.goldMuted}`,
                        backgroundColor: i < character.deathSaves.failures ? "#dc2626" : "transparent",
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Attacks & Spellcasting */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Attacks &amp; Spellcasting</div>
              {weapons.length > 0 ? (
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", fontWeight: 500, paddingBottom: 4, fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em" }}>Name</th>
                      <th style={{ textAlign: "center", fontWeight: 500, paddingBottom: 4, fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em" }}>Atk Bonus</th>
                      <th style={{ textAlign: "right", fontWeight: 500, paddingBottom: 4, fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em" }}>Damage/Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.slice(0, 5).map((w, idx) => (
                      <tr key={w.name} style={{ background: idx % 2 === 0 ? C.rowOdd : C.rowEven }}>
                        <td style={{ padding: "4px 4px", color: C.parchment, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</td>
                        <td style={{ padding: "4px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 600, color: C.gold }}>{w.atkBonus}</td>
                        <td style={{ padding: "4px 4px", textAlign: "right", fontFamily: "monospace", color: C.parchment }}>{w.damage} {w.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: 11, color: C.goldMuted, fontStyle: "italic" }}>No weapons equipped</div>
              )}
            </div>

            {/* Equipment — Worn */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Worn Equipment</div>
              {equippedItems.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-1">
                  {equippedItems.map((item) => {
                    const info = getItemInfo(item);
                    const icon = getItemIcon(item);
                    const isIdentified = !info?.isMagical || character.identifiedItems.includes(item);
                    const isMagic = info?.isMagical;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(selectedItem === item ? null : item)}
                          style={{
                            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                            fontSize: 11, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                            background: isMagic ? C.purpleMuted : "rgba(201,162,39,0.05)",
                            border: `1px solid ${isMagic ? "rgba(168,85,247,0.3)" : C.goldBorder}`,
                            color: C.parchment, fontFamily: bodyFont,
                            outline: selectedItem === item ? `1px solid ${C.gold}` : "none",
                          }}
                        >
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                          {isMagic && !isIdentified && <span style={{ fontSize: 9, color: C.purple, flexShrink: 0 }}>???</span>}
                        </button>
                        {selectedItem === item && (
                          <div style={{ margin: "4px 4px 0", padding: 8, background: "rgba(201,162,39,0.05)", borderRadius: 4, fontSize: 10, color: C.parchmentMuted, border: `1px solid ${C.goldBorder}` }}>
                            <div>{info?.description ?? "A mysterious item."}</div>
                            {isMagic && isIdentified && info?.magicalProperties && (
                              <div style={{ marginTop: 4, color: C.purple, fontWeight: 600 }}>{info.magicalProperties}</div>
                            )}
                            {isMagic && !isIdentified && (
                              <div style={{ marginTop: 4, color: C.purple, fontStyle: "italic" }}>Magical properties unknown. Requires identification.</div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{ fontSize: 11, color: C.goldMuted, fontStyle: "italic" }}>Nothing equipped</div>
              )}
            </div>

            {/* Backpack / Inventory */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={sectionHeaderStyle}>Backpack</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, fontFamily: headerFont }}>{character.gold} GP</div>
              </div>
              {backpackItems.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-1">
                  {backpackItems.map((item) => {
                    const info = getItemInfo(item);
                    const icon = getItemIcon(item);
                    const isIdentified = !info?.isMagical || character.identifiedItems.includes(item);
                    const isMagic = info?.isMagical;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(selectedItem === item ? null : item)}
                          style={{
                            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 6,
                            fontSize: 11, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                            background: isMagic ? C.purpleMuted : "rgba(201,162,39,0.05)",
                            border: `1px solid ${isMagic ? "rgba(168,85,247,0.3)" : C.goldBorder}`,
                            color: C.parchment, fontFamily: bodyFont,
                            outline: selectedItem === item ? `1px solid ${C.gold}` : "none",
                          }}
                        >
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                          {isMagic && !isIdentified && <span style={{ fontSize: 9, color: C.purple, flexShrink: 0 }}>???</span>}
                        </button>
                        {selectedItem === item && (
                          <div style={{ margin: "4px 4px 0", padding: 8, background: "rgba(201,162,39,0.05)", borderRadius: 4, fontSize: 10, color: C.parchmentMuted, border: `1px solid ${C.goldBorder}` }}>
                            <div>{info?.description ?? "A mysterious item."}</div>
                            {isMagic && isIdentified && info?.magicalProperties && (
                              <div style={{ marginTop: 4, color: C.purple, fontWeight: 600 }}>{info.magicalProperties}</div>
                            )}
                            {isMagic && !isIdentified && (
                              <div style={{ marginTop: 4, color: C.purple, fontStyle: "italic" }}>Magical properties unknown. Requires identification.</div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{ fontSize: 11, color: C.goldMuted, fontStyle: "italic" }}>Empty</div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">

            {/* Alignment / Karma */}
            <button
              type="button"
              onClick={() => setShowKarmaHistory(true)}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                ...sectionStyle,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.goldBorder)}
            >
              <div style={sectionHeaderStyle}>Alignment</div>
              <div style={{
                fontSize: 13, fontWeight: 700, fontFamily: headerFont,
                color: character.karma > 25 ? "#22c55e" : character.karma < -25 ? "#dc2626" : C.parchmentMuted,
              }}>
                {alignmentLabel}
              </div>
              <div style={{ fontSize: 10, color: C.goldMuted, marginTop: 4 }}>
                Karma: {character.karma > 0 ? "+" : ""}{character.karma}
              </div>
              {karmaHistory.length > 0 && (
                <div style={{ fontSize: 10, color: C.goldMuted, textDecoration: "underline" }}>
                  {karmaHistory.length} moral action{karmaHistory.length > 1 ? "s" : ""} — view history
                </div>
              )}
            </button>

            {/* Fame */}
            <button
              type="button"
              onClick={() => setShowFameHistory(true)}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                ...sectionStyle,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.goldBorder)}
            >
              <div style={sectionHeaderStyle}>Fame</div>
              <div style={{
                fontSize: 13, fontWeight: 700, fontFamily: headerFont,
                color: character.fame >= 75 ? "#fbbf24" : character.fame >= 40 ? "#38bdf8" : character.fame >= 15 ? C.parchment : C.goldMuted,
              }}>
                {character.fame >= 75 ? "Legendary" :
                 character.fame >= 50 ? "Renowned" :
                 character.fame >= 30 ? "Well-Known" :
                 character.fame >= 15 ? "Recognized" :
                 "Unknown"}
              </div>
              <div style={{ fontSize: 10, color: C.goldMuted, marginTop: 4 }}>
                Score: {character.fame}
              </div>
              {fameHistory.length > 0 && (
                <div style={{ fontSize: 10, color: C.goldMuted, textDecoration: "underline" }}>
                  {fameHistory.length} event{fameHistory.length > 1 ? "s" : ""} — view history
                </div>
              )}
            </button>

            {/* Racial Traits & Features */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Features &amp; Traits</div>
              <div style={{ fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", marginBottom: 4 }}>{character.race} Traits</div>
              <ul style={{ listStyle: "none", margin: "0 0 12px 0", padding: 0 }} className="space-y-0.5">
                {(character.racialTraits?.length > 0 ? character.racialTraits : racialTraits).map((trait) => (
                  <li key={trait} style={{ fontSize: 11, color: C.parchment }}>{trait}</li>
                ))}
              </ul>
              <div style={{ fontSize: 10, color: C.gold, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", marginBottom: 4 }}>{character.class} Features</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-0.5">
                <li style={{ fontSize: 11, color: C.parchment }}>Hit Die: {hitDie}</li>
                <li style={{ fontSize: 11, color: C.parchment }}>Save Prof: {classSaves.join(", ")}</li>
                {character.fightingStyle && (
                  <li style={{ fontSize: 11, color: C.parchment }}>Fighting Style: {character.fightingStyle}</li>
                )}
              </ul>
            </div>

            {/* Cantrips & Spells */}
            {(character.cantrips?.length > 0 || character.spells?.length > 0) && (
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Spellcasting</div>
                {character.cantrips?.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: C.purple, fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em", marginBottom: 4 }}>Cantrips</div>
                    <ul style={{ listStyle: "none", margin: "0 0 8px 0", padding: 0 }} className="space-y-0.5">
                      {character.cantrips.map((c) => (
                        <li key={c} style={{ fontSize: 11, color: C.parchment }}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
                {character.spells?.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "#60a5fa", fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.08em", marginBottom: 4 }}>1st Level</div>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-0.5">
                      {character.spells.map((s) => (
                        <li key={s} style={{ fontSize: 11, color: C.parchment }}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Location */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Current Location</div>
              <div style={{ fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#22c55e" }}>&#x25CF;</span>
                <span style={{ color: C.gold }}>{location}</span>
              </div>
            </div>

            {/* Skills */}
            <div style={{ ...sectionStyle, padding: 8 }}>
              <div style={sectionHeaderStyle}>Skills</div>
              {SKILLS.map(([skill, ability]) => {
                const val = abilityMap[ability];
                const isProficient = (character.skillProficiencies ?? []).includes(skill);
                const skillMod = abilityMod(val) + (isProficient ? profBonus : 0);
                return (
                  <div key={skill} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "2px 0" }}>
                    <ProfDot filled={isProficient} />
                    <span style={{ fontFamily: "monospace", width: 24, textAlign: "right", fontWeight: 600, color: C.parchment }}>{fmtMod(skillMod)}</span>
                    <span style={{ color: isProficient ? C.parchment : C.goldMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {skill} <span style={{ fontSize: 9, color: C.goldMuted }}>({ability})</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quest Log */}
            {questLog.length > 0 && (
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Quest Log</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-1">
                  {questLog.map((q) => (
                    <li key={q} style={{ fontSize: 11, color: C.gold }}>
                      &#x2694; {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unconscious warning */}
            {character.isUnconscious && (
              <div style={{ background: "rgba(139,0,0,0.3)", borderRadius: 8, padding: 12, border: `1px solid ${C.crimsonBorder}` }} className="animate-pulse">
                <div style={{ fontSize: 10, color: "#dc2626", fontFamily: headerFont, fontVariant: "small-caps", letterSpacing: "0.1em", fontWeight: 700, textAlign: "center" }}>
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

        {/* Fame History sub-modal */}
        {showFameHistory && (
          <FameHistory
            fame={character.fame}
            history={fameHistory}
            onClose={() => setShowFameHistory(false)}
          />
        )}
      </div>
    </div>
  );
}
