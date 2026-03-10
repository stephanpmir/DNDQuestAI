"use client";

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
import { GENDERS } from "@/types/character";
import type { Gender } from "@/types/character";
import { MAX_NAME_LENGTH } from "@/lib/constants";
import { generateRandomName } from "@/lib/descriptions";

interface StepIdentityProps {
  name: string;
  gender: Gender;
  onNameChange: (name: string) => void;
  onGenderChange: (gender: Gender) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepIdentity({
  name,
  gender,
  onNameChange,
  onGenderChange,
  onNext,
  onBack,
}: StepIdentityProps) {
  const nameValid = name.trim().length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who Are You?</CardTitle>
        <CardDescription>
          Give your character a name and choose their gender.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Character Name</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              value={name}
              onChange={(e) =>
                onNameChange(e.target.value.slice(0, MAX_NAME_LENGTH))
              }
              placeholder="Enter a name..."
              autoFocus
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => onNameChange(generateRandomName())}
            >
              Random
            </Button>
          </div>
          {!nameValid && name.length > 0 && (
            <p className="text-xs text-amber-400">
              Name must be at least 2 characters.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Gender</Label>
          <Select
            value={gender}
            onValueChange={(v) => onGenderChange(v as Gender)}
          >
            <SelectTrigger className="w-full">
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

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={onNext} disabled={!nameValid} className="flex-1">
            Next — Choose Race
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
