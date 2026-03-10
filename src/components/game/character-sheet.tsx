"use client";

import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useKarmaStore } from "@/stores/karma-store";
import { getAlignment, ALIGNMENT_LABELS } from "@/lib/karma";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

export function CharacterSheet({ onClose }: Props) {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();
  const { karmaHistory } = useKarmaStore();

  const alignment = getAlignment(character.karma);
  const alignmentLabel = ALIGNMENT_LABELS[alignment];

  const mod = (score: number) => {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  const profBonus = Math.floor((character.level - 1) / 4) + 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-2xl h-[85vh] bg-card border border-border rounded-xl shadow-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-muted-foreground hover:text-foreground text-2xl leading-none"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-tight">{character.name}</h2>
          <p className="text-sm text-muted-foreground">
            Level {character.level} {character.gender} {character.race} {character.class}
          </p>
        </div>

        {/* Core stats row */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <StatBox label="HP" value={`${character.hp}/${character.maxHp}`} color="text-red-400" />
          <StatBox label="AC" value={String(character.ac)} />
          <StatBox label="Prof Bonus" value={`+${profBonus}`} />
          <StatBox label="Gold" value={String(character.gold)} color="text-amber-400" />
          <StatBox label="XP" value={character.xpToNextLevel === Infinity ? "MAX" : `${character.xp}/${character.xpToNextLevel}`} color="text-blue-400" />
        </div>

        {/* Ability Scores */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Ability Scores</h3>
          <div className="grid grid-cols-6 gap-2">
            {([
              ["STR", character.abilityScores.strength],
              ["DEX", character.abilityScores.dexterity],
              ["CON", character.abilityScores.constitution],
              ["INT", character.abilityScores.intelligence],
              ["WIS", character.abilityScores.wisdom],
              ["CHA", character.abilityScores.charisma],
            ] as const).map(([label, val]) => (
              <div key={label} className="text-center bg-muted/40 rounded-lg py-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
                <div className="text-2xl font-black">{val}</div>
                <div className="text-xs text-muted-foreground">{mod(val)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Saving Throws */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Saving Throws</h3>
          <div className="grid grid-cols-6 gap-2">
            {([
              ["STR", character.abilityScores.strength],
              ["DEX", character.abilityScores.dexterity],
              ["CON", character.abilityScores.constitution],
              ["INT", character.abilityScores.intelligence],
              ["WIS", character.abilityScores.wisdom],
              ["CHA", character.abilityScores.charisma],
            ] as const).map(([label, val]) => {
              const saveMod = Math.floor((val - 10) / 2);
              return (
                <div key={label} className="text-center bg-muted/20 rounded py-1.5 border border-border/20">
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                  <div className="text-sm font-bold">{saveMod >= 0 ? "+" : ""}{saveMod}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Karma / Alignment */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Karma & Alignment</h3>
          <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-3 border border-border/20">
            <div>
              <span className={cn(
                "text-xl font-black",
                character.karma > 25 ? "text-emerald-400" :
                character.karma < -25 ? "text-red-400" :
                "text-gray-400"
              )}>
                {character.karma > 0 ? "+" : ""}{character.karma}
              </span>
            </div>
            <div>
              <div className="font-bold text-sm">{alignmentLabel}</div>
              <div className="text-xs text-muted-foreground">
                {karmaHistory.length > 0
                  ? `${karmaHistory.length} moral action${karmaHistory.length > 1 ? "s" : ""} recorded`
                  : "No moral actions yet"}
              </div>
            </div>
          </div>
        </div>

        {/* Death Saves (if unconscious) */}
        {character.isUnconscious && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Death Saves</h3>
            <div className="flex gap-6 bg-red-950/40 rounded-lg p-3 border border-red-700/30">
              <div>
                <span className="text-xs text-muted-foreground">Successes: </span>
                <span className="font-bold text-emerald-400">{character.deathSaves.successes}/3</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Failures: </span>
                <span className="font-bold text-red-400">{character.deathSaves.failures}/3</span>
              </div>
            </div>
          </div>
        )}

        {/* Location */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Current Location</h3>
          <div className="text-sm flex items-center gap-1.5">
            <span className="text-green-400">&#x25CF;</span>
            {location}
          </div>
        </div>

        {/* Inventory */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Inventory ({character.inventory.length} items)
          </h3>
          {character.inventory.length > 0 ? (
            <ul className="grid grid-cols-2 gap-1">
              {character.inventory.map((item) => (
                <li
                  key={item}
                  className="text-xs px-2 py-1 bg-muted/30 rounded border border-border/20 truncate"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">Empty</p>
          )}
        </div>

        {/* Quest Log */}
        {questLog.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quest Log</h3>
            <ul className="space-y-1">
              {questLog.map((q) => (
                <li key={q} className="text-xs text-amber-300/80">
                  &#x2694; {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center bg-muted/40 rounded-lg py-2 border border-border/30">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm font-black leading-tight", color)}>{value}</div>
    </div>
  );
}
