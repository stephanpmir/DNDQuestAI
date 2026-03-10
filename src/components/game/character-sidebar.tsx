"use client";

import { useState } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { getAlignment, ALIGNMENT_LABELS } from "@/lib/karma";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CharacterSheet } from "./character-sheet";

/** Weapon keywords */
const WEAPON_KEYWORDS = [
  "sword", "axe", "mace", "dagger", "bow", "staff", "wand", "spear",
  "crossbow", "hammer", "flail", "halberd", "rapier", "scimitar",
  "longsword", "shortsword", "greataxe", "greatsword", "battleaxe",
  "trident", "lance", "whip", "quarterstaff", "longbow", "shortbow",
  "handaxe", "javelin", "maul", "morningstar", "pike", "sickle",
  "war pick", "glaive",
];

/** Armor/shield keywords */
const ARMOR_KEYWORDS = [
  "armor", "shield", "helm", "helmet", "boots", "gauntlets", "bracers",
  "greaves", "chainmail", "chain mail", "plate", "leather armor",
  "scale mail", "breastplate", "half plate", "splint", "studded",
  "wooden shield",
];

/** Worn accessory keywords */
const ACCESSORY_KEYWORDS = [
  "cloak", "ring", "amulet", "robe", "circlet", "belt", "gloves",
  "holy symbol", "arcane focus", "druidic focus", "spellbook",
  "lute", "thieves' tools",
];

type ItemCategory = "weapon" | "armor" | "accessory" | "backpack";

function categorizeItem(item: string): ItemCategory {
  const lower = item.toLowerCase();
  if (WEAPON_KEYWORDS.some((kw) => lower.includes(kw))) return "weapon";
  if (ARMOR_KEYWORDS.some((kw) => lower.includes(kw))) return "armor";
  if (ACCESSORY_KEYWORDS.some((kw) => lower.includes(kw))) return "accessory";
  return "backpack";
}

function isEquipped(item: string): boolean {
  return categorizeItem(item) !== "backpack";
}

const CATEGORY_ICONS: Record<ItemCategory, string> = {
  weapon: "\u2694",   // crossed swords
  armor: "\uD83D\uDEE1",    // shield
  accessory: "\u2728", // sparkles
  backpack: "\u25AA",  // small square
};

export function CharacterSidebar() {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();
  const { companions } = useKarmaStore();

  const [equippedOpen, setEquippedOpen] = useState(true);
  const [backpackOpen, setBackpackOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const alignment = getAlignment(character.karma);
  const alignmentLabel = ALIGNMENT_LABELS[alignment];
  const activeCompanions = companions.filter((c) => c.isRecruited && !c.hasLeft);

  const hpPercent = character.maxHp
    ? Math.round((character.hp / character.maxHp) * 100)
    : 100;

  const xpPercent = character.xpToNextLevel === Infinity
    ? 100
    : character.xpToNextLevel > 0
      ? Math.round((character.xp / character.xpToNextLevel) * 100)
      : 0;

  const mod = (score: number) => {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  const equipped = character.inventory.filter(isEquipped);
  const backpack = character.inventory.filter((item) => !isEquipped(item));

  const hpColor = hpPercent > 60 ? "bg-red-500" : hpPercent > 25 ? "bg-orange-500" : "bg-red-700";

  return (
    <>
      <div className="h-full flex flex-col bg-card border border-border/50 rounded-lg text-card-foreground text-sm overflow-hidden">
        {/* Character identity — icon left of name */}
        <div className="px-4 pt-4 pb-2 bg-gradient-to-b from-muted/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-primary/70">
                {character.name ? character.name.charAt(0).toUpperCase() : "?"}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight truncate">{character.name}</div>
              <div className="text-xs text-muted-foreground">
                Lv {character.level} {character.gender} {character.race} {character.class}
              </div>
            </div>
          </div>
        </div>

        {/* HP bar */}
        <div className="px-4 space-y-1.5">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-red-400 font-semibold">HP</span>
              <span className="font-mono">{character.hp}/{character.maxHp}</span>
            </div>
            <div className="w-full bg-red-950/80 rounded-full h-3 overflow-hidden border border-red-900/50">
              <div
                className={cn("h-full rounded-full transition-all duration-500", hpColor)}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-blue-400 font-semibold">XP</span>
              <span className="font-mono text-[11px]">
                {character.xpToNextLevel === Infinity
                  ? "MAX"
                  : `${character.xp}/${character.xpToNextLevel}`}
              </span>
            </div>
            <div className="w-full bg-blue-950/80 rounded-full h-2 overflow-hidden border border-blue-900/50">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(xpPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Unconscious/Death warning */}
          {character.isUnconscious && (
            <div className="text-center py-1 bg-red-950/60 border border-red-700/50 rounded text-red-300 text-xs font-bold animate-pulse">
              UNCONSCIOUS — Death Saves: {character.deathSaves.successes}S / {character.deathSaves.failures}F
            </div>
          )}

          {/* AC / Gold / Stats row */}
          <div className="flex gap-2">
            <div className="flex-1 text-center bg-muted/40 rounded-lg py-1.5 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">AC</div>
              <div className="text-lg font-black leading-tight">{character.ac}</div>
            </div>
            <div className="flex-1 text-center bg-muted/40 rounded-lg py-1.5 border border-border/30">
              <div className="text-[10px] text-amber-400/80 uppercase tracking-wider">Gold</div>
              <div className="text-lg font-black text-amber-400 leading-tight">{character.gold}</div>
            </div>
          </div>

          {/* Ability scores — compact 2x3 grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ["STR", character.abilityScores.strength],
              ["DEX", character.abilityScores.dexterity],
              ["CON", character.abilityScores.constitution],
              ["INT", character.abilityScores.intelligence],
              ["WIS", character.abilityScores.wisdom],
              ["CHA", character.abilityScores.charisma],
            ] as const).map(([label, val]) => (
              <div key={label} className="text-center bg-muted/30 rounded py-0.5 border border-border/20">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="font-semibold text-xs leading-tight">
                  {val} <span className="text-muted-foreground">({mod(val)})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Character Sheet button (replaces karma display) */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "w-full text-center bg-muted/40 rounded-lg py-1.5 border border-border/30 cursor-pointer hover:bg-muted/60 transition-colors",
            )}
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Character Sheet</div>
            <div className={cn(
              "text-sm font-bold leading-tight",
              character.karma > 25 ? "text-emerald-400" :
              character.karma < -25 ? "text-red-400" :
              "text-gray-400"
            )}>
              {alignmentLabel}
            </div>
          </button>
        </div>

        <Separator className="my-2" />

        {/* Location */}
        <div className="px-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Location</div>
          <div className="font-medium text-xs flex items-center gap-1.5">
            <span className="text-green-400">&#x25CF;</span>
            {location}
          </div>
        </div>

        <Separator className="my-2" />

        {/* Equipment section — collapsible */}
        <div className="px-4">
          <button
            type="button"
            onClick={() => setEquippedOpen(!equippedOpen)}
            className="flex items-center justify-between w-full text-[10px] text-muted-foreground uppercase tracking-wider mb-1 hover:text-foreground transition-colors"
          >
            <span>Equipped ({equipped.length})</span>
            <span className="text-xs">{equippedOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {equippedOpen && (
            equipped.length > 0 ? (
              <ul className="space-y-0.5">
                {equipped.map((item) => (
                  <li
                    key={item}
                    className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 rounded truncate flex items-center gap-1.5"
                  >
                    <span className="text-primary/70">{CATEGORY_ICONS[categorizeItem(item)]}</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground italic">None</div>
            )
          )}
        </div>

        <Separator className="my-2" />

        {/* Backpack items — collapsible */}
        <div className="px-4 flex-1 min-h-0 overflow-y-auto">
          <button
            type="button"
            onClick={() => setBackpackOpen(!backpackOpen)}
            className="flex items-center justify-between w-full text-[10px] text-muted-foreground uppercase tracking-wider mb-1 hover:text-foreground transition-colors"
          >
            <span>Backpack ({backpack.length})</span>
            <span className="text-xs">{backpackOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {backpackOpen && (
            backpack.length > 0 ? (
              <ul className="space-y-0.5">
                {backpack.map((item) => (
                  <li
                    key={item}
                    className="text-xs px-2 py-0.5 bg-muted/30 rounded truncate"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground italic">Empty</div>
            )
          )}
        </div>

        {/* Companions */}
        {activeCompanions.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-4">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Companions</div>
              <ul className="space-y-1">
                {activeCompanions.map((comp) => (
                  <li key={comp.id} className="text-xs bg-muted/30 rounded px-2 py-1 border border-border/20">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold truncate">{comp.name}</span>
                      <span className={cn(
                        "text-[10px]",
                        comp.disposition === "loyal" ? "text-emerald-400" :
                        comp.disposition === "friendly" ? "text-green-400" :
                        comp.disposition === "neutral" ? "text-gray-400" :
                        comp.disposition === "wary" ? "text-orange-400" :
                        "text-red-400"
                      )}>
                        {comp.disposition}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {comp.race} {comp.class} L{comp.level} | HP: {comp.hp}/{comp.maxHp}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Quests */}
        {questLog.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-4 pb-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Quests</div>
              <ul className="space-y-0.5">
                {questLog.map((q) => (
                  <li key={q} className="text-xs text-amber-300/80 truncate">
                    &#x2694; {q}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Character Sheet Modal */}
      {sheetOpen && <CharacterSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
