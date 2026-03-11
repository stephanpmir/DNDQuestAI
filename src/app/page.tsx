"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const BG_PROMPT =
  "dark fantasy medieval landscape, dragon silhouette, dramatic stormy sky, red and gold lighting, cinematic wide shot, D&D concept art";
const STORAGE_KEY = "dndquest-landing-bg";

/** Build a Pollinations URL with a random seed */
function buildBgUrl(seed: number) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(BG_PROMPT)}?width=1920&height=1080&seed=${seed}&nologo=true&enhance=true`;
}

/** Get or create a cached background URL */
function getCachedBgUrl(): string {
  if (typeof window === "undefined") return buildBgUrl(42);
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;
  const url = buildBgUrl(42);
  localStorage.setItem(STORAGE_KEY, url);
  return url;
}

export default function HomePage() {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setBgUrl(getCachedBgUrl());
  }, []);

  const handleRegenerate = useCallback(() => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = buildBgUrl(seed);
    localStorage.setItem(STORAGE_KEY, url);
    setBgLoaded(false);
    setBgUrl(url);
  }, []);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center">
      {/* Pollinations background image */}
      {bgUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={bgUrl}
          alt=""
          aria-hidden
          onLoad={() => setBgLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            bgLoaded ? "opacity-100" : "opacity-0"
          } animate-slow-zoom`}
        />
      )}

      {/* Loading shimmer while image loads */}
      {!bgLoaded && (
        <div className="absolute inset-0 bg-[#0a0a0f] animate-shimmer" />
      )}

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_200px_60px_rgba(0,0,0,0.8)]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto space-y-8">
        {/* Decorative top rule */}
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600/60" />
          <div className="w-2 h-2 rotate-45 border border-amber-500/60" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600/60" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-cinzel-decorative text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 drop-shadow-lg">
            DND Quest AI
          </h1>
          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          <p className="font-cinzel text-sm sm:text-base tracking-[0.3em] uppercase text-amber-200/70">
            AI Dungeon Master
          </p>
        </div>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-300/90 max-w-md mx-auto leading-relaxed">
          Create a character, choose your path, and let the AI weave your story.
          <span className="block mt-1 text-amber-300/60 text-sm italic">
            Every decision matters.
          </span>
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Link href="/character">
            <button className="relative group px-10 py-4 font-cinzel text-lg tracking-widest uppercase text-amber-100 bg-gradient-to-b from-amber-900/80 to-red-950/80 border border-amber-500/40 rounded-sm cursor-pointer transition-all duration-300 hover:border-amber-400/70 hover:from-amber-800/90 hover:to-red-900/90 animate-glow-pulse">
              {/* Inner glow on hover */}
              <span className="absolute inset-0 rounded-sm bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors duration-300" />
              <span className="relative">New Adventure</span>
            </button>
          </Link>
        </div>

        {/* Decorative bottom rule */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-600/40" />
          <div className="w-1.5 h-1.5 rotate-45 bg-red-500/40" />
          <div className="h-px w-24 bg-gradient-to-r from-red-600/40 via-amber-600/30 to-red-600/40" />
          <div className="w-1.5 h-1.5 rotate-45 bg-red-500/40" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-600/40" />
        </div>

        {/* Tagline */}
        <p className="text-xs text-gray-500/60 tracking-wider">
          Powered by AI &bull; D&D 5e Rules &bull; Solo Adventure
        </p>
      </div>

      {/* Regenerate background button — bottom-right corner */}
      <button
        onClick={handleRegenerate}
        title="Generate new background"
        className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-black/40 border border-white/10 text-gray-400/60 hover:text-amber-300/80 hover:border-amber-500/30 hover:bg-black/60 transition-all duration-300 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>
    </main>
  );
}
