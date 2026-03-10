"use client";

import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { useWorldStore } from "@/stores/world-store";
import { useKarmaStore } from "@/stores/karma-store";
import { GENDERS, RACES, CLASSES } from "@/types/character";
import { MAX_NAME_LENGTH } from "@/lib/constants";
import { AbilityScorePicker } from "./ability-score-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CharacterForm() {
  const router = useRouter();
  const {
    character,
    setName,
    setGender,
    setRace,
    setClass,
    setAbilityScores,
    finalizeCharacter,
  } = useCharacterStore();
  const resetGame = useGameStore((s) => s.reset);
  const resetWorld = useWorldStore((s) => s.reset);
  const resetKarma = useKarmaStore((s) => s.reset);

  const isValid = character.name.trim().length >= 2;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    resetGame();
    resetWorld();
    resetKarma();
    finalizeCharacter();
    router.push("/game");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Hero</CardTitle>
          <CardDescription>
            Choose a name, race, and class to begin your adventure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Character Name</Label>
            <Input
              id="name"
              value={character.name}
              onChange={(e) =>
                setName(e.target.value.slice(0, MAX_NAME_LENGTH))
              }
              placeholder="Enter a name..."
              autoFocus
            />
          </div>

          {/* Gender / Race / Class — same row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select
                value={character.gender}
                onValueChange={(v) => setGender(v as typeof character.gender)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Race</Label>
              <Select
                value={character.race}
                onValueChange={(v) => setRace(v as typeof character.race)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Class</Label>
              <Select
                value={character.class}
                onValueChange={(v) => setClass(v as typeof character.class)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ability Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Ability Scores</CardTitle>
          <CardDescription>
            Roll 4d6, drop the lowest die for each ability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AbilityScorePicker
            scores={character.abilityScores}
            onChange={setAbilityScores}
          />
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={!isValid}>
        Begin Adventure
      </Button>
    </form>
  );
}
