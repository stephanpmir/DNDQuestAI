"use client";

import type { Race, CharacterClass, Gender } from "@/types/character";
import { CLASS_SUMMARIES, RACE_SUMMARIES } from "@/lib/descriptions";
import { CLASS_ACCENT } from "./avatar-silhouette";
import { AvatarSilhouette } from "./avatar-silhouette";

interface CharacterAvatarProps {
  name: string;
  race: Race;
  characterClass: CharacterClass;
  gender: Gender;
}

export function CharacterAvatar({
  name,
  race,
  characterClass,
  gender,
}: CharacterAvatarProps) {
  const accent = CLASS_ACCENT[characterClass];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar container with subtle border */}
      <div
        className="relative w-48 h-64 rounded-xl border border-border/30 bg-muted/10 overflow-hidden"
        style={{ boxShadow: `0 0 40px 2px ${accent}15` }}
      >
        <AvatarSilhouette
          race={race}
          characterClass={characterClass}
          gender={gender}
        />
      </div>

      {/* Name label */}
      {name.trim() && (
        <p className="text-sm font-semibold text-center truncate max-w-48">
          {name}
        </p>
      )}

      {/* Race & Class badges */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full border border-border/20">
          {race}
          <span className="text-muted-foreground ml-1">
            {RACE_SUMMARIES[race].tagline}
          </span>
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border"
          style={{
            backgroundColor: `${accent}15`,
            borderColor: `${accent}40`,
            color: accent,
          }}
        >
          {characterClass}
          <span className="opacity-70 ml-1">
            {CLASS_SUMMARIES[characterClass].tagline}
          </span>
        </span>
      </div>
    </div>
  );
}
