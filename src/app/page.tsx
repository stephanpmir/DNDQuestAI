"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SlotId, SaveSlot } from "@/stores/save-store";
import { restoreSnapshot } from "@/lib/save-snapshot";
import { buildPollinationsUrl } from "@/lib/avatar";

const BG_PROMPT =
  "dark fantasy medieval landscape, dragon silhouette, dramatic stormy sky, red and gold lighting, cinematic wide shot, D&D concept art";
const STORAGE_KEY = "dndquest-landing-bg";

function buildBgUrl(seed: number) {
  return buildPollinationsUrl(BG_PROMPT, {
    width: "1920",
    height: "1080",
    seed: String(seed),
    nologo: "true",
    enhance: "true",
  });
}

function getCachedBgUrl(): string {
  if (typeof window === "undefined") return buildBgUrl(42);
  const cached = localStorage.getItem(STORAGE_KEY);
  // Invalidate stale direct-Pollinations URLs from before the proxy switch
  if (cached && cached.startsWith("/api/")) return cached;
  const url = buildBgUrl(42);
  localStorage.setItem(STORAGE_KEY, url);
  return url;
}

interface SaveInfo {
  slotId: SlotId;
  characterName: string;
  characterLevel: number;
  location: string;
  savedAt: string;
  snapshot: SaveSlot["snapshot"];
}

const SLOT_LABELS: Record<SlotId, string> = {
  auto: "Auto-Save",
  "slot-1": "Slot 1",
  "slot-2": "Slot 2",
  "slot-3": "Slot 3",
};

/** Read all save slots from localStorage (raw read, no Zustand import) */
function getAllSaves(): SaveInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("dndquest-save");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const slots = parsed?.state?.slots;
    if (!slots || typeof slots !== "object") return [];
    const saves: SaveInfo[] = [];
    for (const [slotId, slot] of Object.entries(slots)) {
      const s = slot as SaveSlot;
      if (s?.savedAt && s?.characterName && s?.snapshot) {
        saves.push({
          slotId: slotId as SlotId,
          characterName: s.characterName,
          characterLevel: s.characterLevel ?? 1,
          location: s.location ?? "Unknown",
          savedAt: s.savedAt,
          snapshot: s.snapshot,
        });
      }
    }
    saves.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return saves;
  } catch {
    return [];
  }
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomePage() {
  const router = useRouter();
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [saves, setSaves] = useState<SaveInfo[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  useEffect(() => {
    setBgUrl(getCachedBgUrl());
    setSaves(getAllSaves());
  }, []);

  const handleRegenerate = useCallback(() => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = buildBgUrl(seed);
    localStorage.setItem(STORAGE_KEY, url);
    setBgLoaded(false);
    setBgUrl(url);
  }, []);

  const mostRecent = saves[0] ?? null;
  const hasMultipleSaves = saves.length > 1;

  function handleLoadSave(save: SaveInfo) {
    restoreSnapshot(save.snapshot);
    router.push("/game");
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center">
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

      {!bgLoaded && (
        <div className="absolute inset-0 bg-[#0a0a0f] animate-shimmer" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
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

        {/* Action Buttons */}
        <div className="pt-4 space-y-4">
          {/* Continue Adventure — most recent save */}
          {mostRecent && (
            <div>
              <button
                onClick={() => handleLoadSave(mostRecent)}
                className="relative group w-full max-w-sm mx-auto px-8 py-4 font-cinzel text-base tracking-widest uppercase text-amber-100 bg-gradient-to-b from-amber-900/80 to-red-950/80 border border-amber-500/40 rounded-sm cursor-pointer transition-all duration-300 hover:border-amber-400/70 hover:from-amber-800/90 hover:to-red-900/90 animate-glow-pulse"
              >
                <span className="absolute inset-0 rounded-sm bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors duration-300" />
                <span className="relative block">Continue Adventure</span>
              </button>
              <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400/70">
                <span className="text-amber-300/70 font-cinzel font-semibold">
                  {mostRecent.characterName}
                </span>
                <span className="text-gray-600">·</span>
                <span>Lvl {mostRecent.characterLevel}</span>
                <span className="text-gray-600">·</span>
                <span>{mostRecent.location}</span>
                <span className="text-gray-600">·</span>
                <span>{formatTimeAgo(mostRecent.savedAt)}</span>
              </div>
            </div>
          )}

          {/* Load Game — shows when multiple saves exist */}
          {hasMultipleSaves && (
            <div>
              <button
                onClick={() => setShowLoadMenu((v) => !v)}
                className="relative group px-8 py-3 font-cinzel text-sm tracking-widest uppercase text-gray-300/80 bg-white/5 border border-white/10 rounded-sm cursor-pointer transition-all duration-300 hover:border-amber-500/30 hover:text-amber-200/90 hover:bg-white/10"
              >
                <span className="absolute inset-0 rounded-sm bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors duration-300" />
                <span className="relative flex items-center gap-2">
                  Load Game
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-transform duration-200 ${showLoadMenu ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {/* Save slots list */}
              {showLoadMenu && (
                <div className="mt-3 max-w-sm mx-auto bg-black/60 border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
                  {saves.map((save) => (
                    <button
                      key={save.slotId}
                      onClick={() => handleLoadSave(save)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-200">
                            {SLOT_LABELS[save.slotId]}
                          </span>
                          {save.slotId === "auto" && (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                              AUTO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400/70">
                          <span className="text-amber-300/70 font-semibold truncate">
                            {save.characterName}
                          </span>
                          <span className="text-gray-600">·</span>
                          <span>Lvl {save.characterLevel}</span>
                          <span className="text-gray-600">·</span>
                          <span className="truncate">{save.location}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0 ml-3">
                        {formatTimeAgo(save.savedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Adventure */}
          <Link href="/character">
            <button
              className={`relative group px-10 py-4 font-cinzel text-lg tracking-widest uppercase cursor-pointer transition-all duration-300 rounded-sm ${
                mostRecent
                  ? "text-gray-300/80 bg-white/5 border border-white/10 hover:border-amber-500/30 hover:text-amber-200/90 hover:bg-white/10"
                  : "text-amber-100 bg-gradient-to-b from-amber-900/80 to-red-950/80 border border-amber-500/40 hover:border-amber-400/70 hover:from-amber-800/90 hover:to-red-900/90 animate-glow-pulse"
              }`}
            >
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

      {/* Regenerate background button */}
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
