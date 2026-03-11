"use client";

import { useState, useEffect } from "react";
import { buildAvatarPreviewUrl, type AvatarPromptInput } from "@/lib/avatar";
import type { Character } from "@/types/character";

interface PortraitLoadingProps {
  character: Character;
  onComplete: (portraitUrl: string | null) => void;
}

/** Full-screen interstitial shown while Pollinations generates the character portrait. */
export function PortraitLoading({ character, onComplete }: PortraitLoadingProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Build the Pollinations URL once on mount
  useEffect(() => {
    const input: AvatarPromptInput = {
      race: character.race,
      class: character.class,
      gender: character.gender,
      avatar: character.avatar,
    };
    const url = buildAvatarPreviewUrl(input, character.name, 768);
    setImageUrl(url);
  }, [character]);

  // Tick elapsed seconds for flavour text
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-continue after image loads (small delay for dramatic effect)
  useEffect(() => {
    if (loaded && imageUrl) {
      const timeout = setTimeout(() => onComplete(imageUrl), 1200);
      return () => clearTimeout(timeout);
    }
  }, [loaded, imageUrl, onComplete]);

  // Safety timeout: proceed after 20s even if image fails
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded) onComplete(null);
    }, 20000);
    return () => clearTimeout(timeout);
  }, [loaded, onComplete]);

  const FLAVOUR_TEXTS = [
    "The fates are weaving your destiny...",
    "A new hero steps into the light...",
    "The realm holds its breath...",
    "Ancient magic stirs...",
  ];
  const flavour = FLAVOUR_TEXTS[Math.min(Math.floor(elapsed / 3), FLAVOUR_TEXTS.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-black to-red-950/20" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        {/* Portrait frame */}
        <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-lg border-2 border-amber-500/30 overflow-hidden bg-black/50">
          {imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={`${character.name} portrait`}
              className={`w-full h-full object-cover transition-opacity duration-1000 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLoaded(true)}
            />
          )}

          {/* Loading overlay */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-shimmer">
              <div className="w-10 h-10 border-2 border-amber-500/60 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-amber-300/60">Generating portrait...</p>
            </div>
          )}

          {/* Gold corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-500/50" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-500/50" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-500/50" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-500/50" />
        </div>

        {/* Character name */}
        <div className="space-y-1">
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-200 tracking-wider">
            {character.name}
          </h2>
          <p className="font-cinzel text-sm text-amber-400/60 tracking-widest uppercase">
            {character.race} {character.class}
          </p>
        </div>

        {/* Flavour text */}
        <p className="text-sm text-gray-400/80 italic max-w-xs animate-pulse">
          {flavour}
        </p>
      </div>
    </div>
  );
}
