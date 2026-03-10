"use client";

import { useRouter } from "next/navigation";
import { useCharacterStore } from "@/stores/character-store";
import { RACES, CLASSES } from "@/types/character";
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
    setRace,
    setClass,
    setAbilityScores,
    finalizeCharacter,
  } = useCharacterStore();

  const isValid = character.name.trim().length >= 2;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
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

          {/* Race */}
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

          {/* Class */}
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
        </CardContent>
      </Card>

      {/* Ability Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Ability Scores</CardTitle>
          <CardDescription>
            Assign the standard array (15, 14, 13, 12, 10, 8) to your
            abilities.
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
