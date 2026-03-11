"use client";

import { useState, useEffect, useRef } from "react";
import type { Race, CharacterClass, Gender, AvatarCustomization } from "@/types/character";
import { CLASS_SUMMARIES, RACE_SUMMARIES } from "@/lib/descriptions";
import { buildAvatarPreviewUrl } from "@/lib/avatar";
import { AvatarCustomizer } from "./avatar-customizer";

/** Class accent colors for badges */
const CLASS_ACCENT: Record<CharacterClass, string> = {
  Barbarian: "#ef4444",
  Bard: "#f59e0b",
  Cleric: "#fbbf24",
  Druid: "#22c55e",
  Fighter: "#94a3b8",
  Monk: "#f59e0b",
  Paladin: "#facc15",
  Ranger: "#22c55e",
  Rogue: "#a78bfa",
  Sorcerer: "#f472b6",
  Warlock: "#8b5cf6",
  Wizard: "#60a5fa",
};

interface CharacterAvatarProps {
  name: string;
  race: Race;
  characterClass: CharacterClass;
  gender: Gender;
  avatar: AvatarCustomization;
  onAvatarChange: (updates: Partial<AvatarCustomization>) => void;
}

export function CharacterAvatar({
  name,
  race,
  characterClass,
  gender,
  avatar,
  onAvatarChange,
}: CharacterAvatarProps) {
  const accent = CLASS_ACCENT[characterClass];
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgStatus, setImgStatus] = useState<string>("waiting");
  const [testStatus, setTestStatus] = useState<string>("loading...");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlCacheRef = useRef<Map<string, string>>(new Map());

  // Hardcoded test image — no token, no dynamic prompt
  const TEST_URL = "https://image.pollinations.ai/prompt/fantasy%20portrait%20warrior%20dark%20background?width=256&height=256&nologo=true";

  // Debounce preview generation — wait 800ms after the last change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const cacheKey = `${gender}-${race}-${characterClass}-${avatar.hairStyle}-${avatar.hairColor}-${avatar.skinTone}-${avatar.bodyBuild}-${avatar.height}`;
      const cached = urlCacheRef.current.get(cacheKey);
      if (cached) {
        if (cached !== imageUrl) {
          setImageUrl(cached);
          console.debug("[AvatarPreview] Using cached URL:", cached);
        }
        return;
      }
      const url = buildAvatarPreviewUrl(
        { race, class: characterClass, gender, avatar },
        name,
        512
      );
      console.debug("[AvatarPreview] Generated URL:", url);
      urlCacheRef.current.set(cacheKey, url);
      setLoading(true);
      setImageUrl(url);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race, characterClass, gender, avatar, name]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar container */}
      <div
        className="relative w-48 h-48 rounded-xl border border-border/30 bg-muted/10 overflow-hidden"
        style={{ boxShadow: `0 0 40px 2px ${accent}15` }}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${name || "Character"} preview`}
              className="w-full h-full object-cover"
              onLoad={() => {
                setLoading(false);
                setImgStatus("LOADED OK");
              }}
              onError={() => {
                setImgStatus("LOAD FAILED");
                if (imageUrl.includes("&token=")) {
                  const fallbackUrl = imageUrl.replace(/&token=[^&]+/, "");
                  setImgStatus("RETRY no-token...");
                  setImageUrl(fallbackUrl);
                } else {
                  setLoading(false);
                }
              }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-1">
              <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px]">Generating preview...</p>
            </div>
          </div>
        )}
      </div>

      {/* DEBUG: Dynamic image status + URL */}
      <div className="w-full space-y-1">
        <p className="text-[9px] text-gray-500 font-mono break-all">
          <span className="text-gray-400">Dynamic [{imgStatus}]:</span>{" "}
          {imageUrl ?? "(none yet)"}
        </p>
      </div>

      {/* DEBUG: Hardcoded test image */}
      <div className="w-full border border-dashed border-gray-600 rounded p-2 space-y-1">
        <p className="text-[9px] text-gray-400">Test image (hardcoded, no token):</p>
        <div className="w-24 h-24 mx-auto bg-black/30 overflow-hidden rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TEST_URL}
            alt="Test"
            className="w-full h-full object-cover"
            onLoad={() => setTestStatus("LOADED OK")}
            onError={() => setTestStatus("FAILED")}
          />
        </div>
        <p className="text-[9px] text-gray-500 font-mono">Status: {testStatus}</p>
        <p className="text-[9px] text-gray-500 font-mono break-all">{TEST_URL}</p>
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

      {/* Customization controls */}
      <div className="w-full border-t border-border/20 pt-3">
        <AvatarCustomizer avatar={avatar} onChange={onAvatarChange} />
      </div>
    </div>
  );
}
