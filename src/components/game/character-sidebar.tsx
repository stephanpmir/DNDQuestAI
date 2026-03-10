"use client";

import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { Separator } from "@/components/ui/separator";

export function CharacterSidebar() {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();

  const hpPercent = character.maxHp
    ? Math.round((character.hp / character.maxHp) * 100)
    : 100;

  const mod = (score: number) => {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  return (
    <div className="h-full flex flex-col bg-card border rounded-lg text-card-foreground text-sm overflow-hidden">
      {/* Character identity */}
      <div className="px-4 pt-4 pb-2 text-center">
        <div className="text-lg font-bold tracking-tight">{character.name}</div>
        <div className="text-xs text-muted-foreground">
          Lv {character.level} {character.race} {character.class}
        </div>
      </div>

      {/* HP / AC / Gold bar */}
      <div className="px-4 space-y-2">
        {/* HP orb-style bar */}
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-red-400 font-semibold">HP</span>
            <span className="font-mono">{character.hp}/{character.maxHp}</span>
          </div>
          <div className="w-full bg-red-950 rounded h-3 overflow-hidden">
            <div
              className="bg-red-500 h-full rounded transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 text-center bg-muted/50 rounded py-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">AC</div>
            <div className="text-base font-bold">{character.ac}</div>
          </div>
          <div className="flex-1 text-center bg-muted/50 rounded py-1">
            <div className="text-[10px] text-amber-400 uppercase tracking-wider">Gold</div>
            <div className="text-base font-bold text-amber-400">{character.gold}</div>
          </div>
        </div>
      </div>

      <Separator className="my-2" />

      {/* Ability scores — compact 2x3 grid */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ["STR", character.abilityScores.strength],
            ["DEX", character.abilityScores.dexterity],
            ["CON", character.abilityScores.constitution],
            ["INT", character.abilityScores.intelligence],
            ["WIS", character.abilityScores.wisdom],
            ["CHA", character.abilityScores.charisma],
          ] as const).map(([label, val]) => (
            <div key={label} className="text-center bg-muted/30 rounded py-0.5">
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="font-semibold text-xs leading-tight">
                {val} <span className="text-muted-foreground">({mod(val)})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-2" />

      {/* Location */}
      <div className="px-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Location</div>
        <div className="font-medium text-xs">{location}</div>
      </div>

      <Separator className="my-2" />

      {/* Inventory */}
      <div className="px-4 flex-1 min-h-0 overflow-y-auto">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Inventory</div>
        {character.inventory.length > 0 ? (
          <ul className="space-y-0.5">
            {character.inventory.map((item) => (
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
        )}
      </div>

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
  );
}
