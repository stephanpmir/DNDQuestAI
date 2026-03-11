"use client";

import { useState, useEffect } from "react";
import { useSaveStore } from "@/stores/save-store";
import { useLanguageStore } from "@/stores/language-store";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function AutoSaveIndicator() {
  const t = useLanguageStore((s) => s.t);
  const autoSlot = useSaveStore((s) => s.slots.auto);
  const lastSavedAt = autoSlot?.savedAt ?? null;
  const [display, setDisplay] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!lastSavedAt) return;
    setDisplay(formatRelative(lastSavedAt));
    const interval = setInterval(() => {
      setDisplay(formatRelative(lastSavedAt));
    }, 15_000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  useEffect(() => {
    if (!lastSavedAt) return;
    setFlash(true);
    const timeout = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(timeout);
  }, [lastSavedAt]);

  if (!display) return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] text-muted-foreground transition-opacity duration-700 ${
        flash ? "opacity-100" : "opacity-60"
      }`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full transition-colors duration-700 ${
          flash ? "bg-emerald-400" : "bg-muted-foreground/40"
        }`}
      />
      {t("autosave.saved")} {display}
    </div>
  );
}
