"use client";

import { useState } from "react";
import Link from "next/link";

const BG_PROMPT =
  "dark fantasy medieval landscape, dragon silhouette, dramatic stormy sky, red and gold lighting, cinematic wide shot, D&D concept art";
const BG_URL = `https://image.pollinations.ai/prompt/${encodeURIComponent(BG_PROMPT)}?width=1920&height=1080&seed=42&nologo=true&enhance=true`;

export default function HomePage() {
  const [bgLoaded, setBgLoaded] = useState(false);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center">
      {/* Pollinations background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_URL}
        alt=""
        aria-hidden
        onLoad={() => setBgLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          bgLoaded ? "opacity-100" : "opacity-0"
        } animate-slow-zoom`}
      />

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
            DNDQuestAI
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
    </main>
  );
}
