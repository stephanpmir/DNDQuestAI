"use client";

import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CharacterSidebar() {
  const { character } = useCharacterStore();
  const { location, questLog } = useGameStore();

  const hpPercent = character.maxHp
    ? Math.round((character.hp / character.maxHp) * 100)
    : 100;

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{character.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Level {character.level} {character.race} {character.class}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span>HP</span>
            <span>
              {character.hp}/{character.maxHp}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between">
          <span>AC</span>
          <span>{character.ac}</span>
        </div>

        <div className="flex justify-between">
          <span>Gold</span>
          <span>{character.gold}</span>
        </div>

        <Separator />

        {/* Ability Scores */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["STR", character.abilityScores.strength],
              ["DEX", character.abilityScores.dexterity],
              ["CON", character.abilityScores.constitution],
              ["WIS", character.abilityScores.wisdom],
              ["INT", character.abilityScores.intelligence],
              ["CHA", character.abilityScores.charisma],
            ] as const
          ).map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-medium">{val}</div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Location */}
        <div>
          <span className="text-muted-foreground">Location:</span>{" "}
          <span>{location}</span>
        </div>

        {/* Inventory */}
        <div>
          <span className="text-muted-foreground block mb-1">Inventory</span>
          <div className="flex flex-wrap gap-1">
            {character.inventory.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
            {character.inventory.length === 0 && (
              <span className="text-muted-foreground text-xs">Empty</span>
            )}
          </div>
        </div>

        {/* Quests */}
        {questLog.length > 0 && (
          <div>
            <Separator className="mb-3" />
            <span className="text-muted-foreground block mb-1">Quests</span>
            <ul className="list-disc list-inside space-y-1">
              {questLog.map((q) => (
                <li key={q} className="text-xs">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
