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
  const [phase, setPhase] = useState<"generating" | "reveal">("generating");

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
    if (phase !== "generating") return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // When image loads, transition to reveal phase
  useEffect(() => {
    if (loaded && imageUrl && phase === "generating") {
      const timeout = setTimeout(() => setPhase("reveal"), 600);
      return () => clearTimeout(timeout);
    }
  }, [loaded, imageUrl, phase]);

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

  // Phase 2: "Your Hero" reveal screen
  if (phase === "reveal" && imageUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-black to-red-950/30" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center animate-fade-in">
          {/* Decorative top rule */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600/60" />
            <div className="w-2 h-2 rotate-45 border border-amber-500/60" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600/60" />
          </div>

          <h2 className="font-cinzel text-lg sm:text-xl tracking-[0.3em] uppercase text-amber-200/80">
            Your Hero
          </h2>

          {/* Large portrait with ornate frame */}
          <div className="relative w-72 h-96 sm:w-80 sm:h-[28rem] rounded-lg overflow-hidden">
            {/* Gold border glow */}
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-b from-amber-400/30 via-amber-600/20 to-amber-400/30 blur-sm" />
            <div className="relative w-full h-full rounded-lg border-2 border-amber-500/50 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${character.name} portrait`}
                className="w-full h-full object-cover"
              />
              {/* Gold corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400/60" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400/60" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400/60" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400/60" />
            </div>
          </div>

          {/* Character info */}
          <div className="space-y-1">
            <h3 className="font-cinzel text-3xl sm:text-4xl font-bold text-amber-200 tracking-wider">
              {character.name}
            </h3>
            <p className="font-cinzel text-sm text-amber-400/60 tracking-widest uppercase">
              {character.race} {character.class}
            </p>
          </div>

          {/* Begin Adventure button */}
          <button
            onClick={() => onComplete(imageUrl)}
            className="relative group px-10 py-3 font-cinzel text-base tracking-widest uppercase text-amber-100 bg-gradient-to-b from-amber-900/80 to-red-950/80 border border-amber-500/40 rounded-sm cursor-pointer transition-all duration-300 hover:border-amber-400/70 hover:from-amber-800/90 hover:to-red-900/90 animate-glow-pulse"
          >
            <span className="absolute inset-0 rounded-sm bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors duration-300" />
            <span className="relative">Begin Adventure</span>
          </button>

          {/* Decorative bottom rule */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-600/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-red-500/40" />
            <div className="h-px w-24 bg-gradient-to-r from-red-600/40 via-amber-600/30 to-red-600/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-red-500/40" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-600/40" />
          </div>
        </div>
      </div>
    );
  }

  // Phase 1: Generating portrait
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
