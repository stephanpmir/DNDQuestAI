"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div
      className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(201,162,39,0.15)" }}
    >
      <div className="px-6 pt-6 pb-3">
        <h2
          className="text-xl font-cinzel font-bold tracking-wide"
          style={{
            background: "linear-gradient(180deg, #f0d060, #c9a227)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Who Are You?
        </h2>
        <p className="text-sm text-[#8a8a8a] mt-1">
          Give your character a name and choose their gender.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-[#c9a227] text-xs font-cinzel tracking-wide">Character Name</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              value={name}
              onChange={(e) =>
                onNameChange(e.target.value.slice(0, MAX_NAME_LENGTH))
              }
              placeholder="Enter a name..."
              autoFocus
              className="bg-[#0f0f0f] border-[#333] text-white placeholder:text-[#555] focus:border-[#c9a227] focus:ring-[#c9a227]/20"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 text-xs bg-[#111] border-[#c9a227] text-[#c9a227] hover:bg-[#6b0000] hover:text-white hover:border-[#c9a227]"
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
          <Label className="text-[#c9a227] text-xs font-cinzel tracking-wide">Gender</Label>
          <Select
            value={gender}
            onValueChange={(v) => onGenderChange(v as Gender)}
          >
            <SelectTrigger className="w-full bg-[#0f0f0f] border-[#333] text-white focus:border-[#c9a227] focus:ring-[#c9a227]/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#c9a227]">
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!nameValid}
            className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide disabled:opacity-40 transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
          >
            Next — Choose Race
          </Button>
        </div>
      </div>
    </div>
  );
}
