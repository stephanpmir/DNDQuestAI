"use client";

import { useState } from "react";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { getAlignment, ALIGNMENT_LABELS } from "@/lib/karma";
import { getItemIcon, getItemInfo } from "@/lib/items";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores/language-store";
import { CharacterSheet } from "./character-sheet";

export function CharacterSidebar() {
  const { character } = useCharacterStore();
  const { location, questLog, groundItems } = useGameStore();
  const { companions } = useKarmaStore();

  const [equippedOpen, setEquippedOpen] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [portraitOpen, setPortraitOpen] = useState(false);
  const t = useLanguageStore((s) => s.t);

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

  const equipped = character.equipped ?? [];
  const backpack = character.inventory.filter((item) => !equipped.includes(item));

  const hpColor = hpPercent > 60 ? "bg-red-500" : hpPercent > 25 ? "bg-orange-500" : "bg-red-700";

  return (
    <>
      <div className="h-full flex flex-col bg-card border border-border/50 rounded-lg text-card-foreground text-sm overflow-hidden">
        {/* Character identity — avatar + name */}
        <div className="px-4 pt-4 pb-2 bg-gradient-to-b from-muted/80 to-transparent">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPortraitOpen(true)}
              className="shrink-0 cursor-pointer transition-transform hover:scale-105 focus:outline-none"
              title="View portrait"
            >
              {character.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={character.avatarUrl}
                  alt={`${character.name} portrait`}
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/50 hover:border-amber-400/80 transition-colors"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-b from-primary/30 to-primary/10 border-2 border-amber-500/50 hover:border-amber-400/80 flex items-center justify-center transition-colors">
                  <span className="text-lg font-black text-primary/70">
                    {character.name
                      ? character.name.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join("")
                      : "?"}
                  </span>
                </div>
              )}
            </button>
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
              <span className="text-red-400 font-semibold">{t("sidebar.hp")}</span>
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
              <span className="text-blue-400 font-semibold">{t("sidebar.xp")}</span>
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

          {/* Karma & Fame row */}
          <div className="flex gap-2">
            <div className="flex-1 text-center bg-muted/40 rounded-lg py-1.5 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("sidebar.karma")}</div>
              <div className={cn(
                "text-sm font-bold leading-tight",
                character.karma > 25 ? "text-emerald-400" :
                character.karma < -25 ? "text-red-400" :
                "text-gray-400"
              )}>
                {alignmentLabel}
              </div>
            </div>
            <div className="flex-1 text-center bg-muted/40 rounded-lg py-1.5 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("sidebar.fame")}</div>
              <div className={cn(
                "text-sm font-bold leading-tight",
                character.fame >= 75 ? "text-amber-400" :
                character.fame >= 40 ? "text-sky-400" :
                character.fame >= 15 ? "text-slate-300" :
                "text-gray-500"
              )}>
                {character.fame >= 75 ? "Legendary" :
                 character.fame >= 50 ? "Renowned" :
                 character.fame >= 30 ? "Well-Known" :
                 character.fame >= 15 ? "Recognized" :
                 "Unknown"}
              </div>
            </div>
          </div>

          {/* Unconscious/Death warning */}
          {character.isUnconscious && (
            <div className="text-center py-1 bg-red-950/60 border border-red-700/50 rounded text-red-300 text-xs font-bold animate-pulse">
              UNCONSCIOUS — Death Saves: {character.deathSaves.successes}S / {character.deathSaves.failures}F
            </div>
          )}

          {/* AC / Gold row */}
          <div className="flex gap-2">
            <div className="flex-1 text-center bg-muted/40 rounded-lg py-1.5 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("sidebar.ac")}</div>
              <div className="text-lg font-black leading-tight">{character.ac}</div>
            </div>
            <div className="flex-1 text-center bg-muted/40 rounded-lg py-1.5 border border-border/30">
              <div className="text-[10px] text-amber-400/80 uppercase tracking-wider">{t("sidebar.gold")}</div>
              <div className="text-lg font-black text-amber-400 leading-tight">{character.gold}</div>
            </div>
          </div>

          {/* Character Sheet button */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full text-center bg-muted/40 rounded-lg py-1.5 border border-border/30 cursor-pointer hover:bg-muted/60 transition-colors"
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("game.characterSheet")}</div>
          </button>
        </div>

        <Separator className="my-2" />

        {/* Location */}
        <div className="px-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{t("sidebar.location")}</div>
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
            <span>{t("sidebar.worn")} ({equipped.length})</span>
            <span className="text-xs">{equippedOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {equippedOpen && (
            equipped.length > 0 ? (
              <ul className="space-y-0.5">
                {equipped.map((item) => {
                  const icon = getItemIcon(item);
                  const info = getItemInfo(item);
                  return (
                    <li
                      key={item}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded truncate flex items-center gap-1.5",
                        info?.isMagical
                          ? "bg-purple-950/30 border border-purple-700/20"
                          : "bg-primary/10 border border-primary/20"
                      )}
                    >
                      <span className="shrink-0">{icon}</span>
                      {item}
                    </li>
                  );
                })}
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
            <span>{t("sidebar.backpack")} ({backpack.length})</span>
            <span className="text-xs">{backpackOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {backpackOpen && (
            backpack.length > 0 ? (
              <ul className="space-y-0.5">
                {backpack.map((item) => {
                  const icon = getItemIcon(item);
                  return (
                    <li
                      key={item}
                      className="text-xs px-2 py-0.5 bg-muted/30 rounded truncate flex items-center gap-1.5"
                    >
                      <span className="shrink-0">{icon}</span>
                      {item}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground italic">Empty</div>
            )
          )}
        </div>

        {/* Ground items (loot) */}
        {groundItems.length > 0 && (
          <div className="px-4 pb-1">
            <div className="text-[10px] text-amber-400/80 uppercase tracking-wider mb-1">
              {t("sidebar.nearby")} ({groundItems.length})
            </div>
            <ul className="space-y-0.5">
              {groundItems.map((item, i) => {
                const icon = getItemIcon(item);
                return (
                  <li
                    key={`${item}-${i}`}
                    className="text-xs px-2 py-0.5 bg-amber-950/30 rounded truncate flex items-center gap-1.5 text-amber-300/80 border border-amber-500/20"
                  >
                    <span className="shrink-0">{icon}</span>
                    {item}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Companions */}
        {activeCompanions.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-4">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("sidebar.companions")}</div>
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
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("sidebar.quests")}</div>
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

      {/* Portrait Modal */}
      {portraitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPortraitOpen(false); }}
        >
          {/* Background ambience */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-red-950/20 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Decorative top rule */}
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600/60" />
              <div className="w-2 h-2 rotate-45 border border-amber-500/60" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600/60" />
            </div>

            <h2 className="font-cinzel text-lg sm:text-xl tracking-[0.3em] uppercase text-amber-200/80">
              {character.name}
            </h2>

            {/* Portrait with ornate golden frame */}
            <div className="relative w-72 h-96 sm:w-80 sm:h-[28rem] rounded-lg overflow-hidden">
              {/* Gold border glow */}
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-b from-amber-400/30 via-amber-600/20 to-amber-400/30 blur-sm" />
              <div className="relative w-full h-full rounded-lg border-2 border-amber-500/50 overflow-hidden bg-black/50">
                {character.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={character.avatarUrl}
                    alt={`${character.name} portrait`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-amber-950/30 to-black">
                    <span className="font-cinzel text-6xl font-bold text-amber-500/40">
                      {character.name
                        ? character.name.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join("")
                        : "?"}
                    </span>
                  </div>
                )}
                {/* Gold corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400/60" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400/60" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400/60" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400/60" />
              </div>
            </div>

            {/* Character subtitle */}
            <p className="font-cinzel text-sm text-amber-400/60 tracking-widest uppercase">
              {character.race} {character.class}
            </p>

            {/* Decorative bottom rule */}
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-600/40" />
              <div className="w-1.5 h-1.5 rotate-45 bg-red-500/40" />
              <div className="h-px w-24 bg-gradient-to-r from-red-600/40 via-amber-600/30 to-red-600/40" />
              <div className="w-1.5 h-1.5 rotate-45 bg-red-500/40" />
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-600/40" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
