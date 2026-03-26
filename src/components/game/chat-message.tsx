"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import { DiceRollDisplay } from "./dice-roll-display";
import { CombatCard } from "./combat-card";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="space-y-0">
        <div className="flex gap-3 justify-end">
          <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground">
            <div className="whitespace-pre-wrap">{message.narrative}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold shrink-0">
            You
          </div>
        </div>
      </div>
    );
  }

  // Rules reference card
  if (message.rulesReference) {
    return (
      <div className="space-y-0">
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-sky-800 text-sky-100 flex items-center justify-center text-[10px] font-bold shrink-0">
            5e
          </div>
          <div className="max-w-[80%] rounded-lg border border-sky-700/40 bg-sky-950/30 px-4 py-3 space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              {message.rulesReference.title}
            </span>
            <p className="text-sm leading-relaxed text-sky-100/90">
              {message.rulesReference.text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Combat phase: render combat card instead of normal narrative
  if (message.phase === "combat" && message.combatState) {
    return (
      <div className="space-y-2">
        <CombatCard combat={message.combatState} />
        <KarmaFameBadges message={message} />
      </div>
    );
  }

  // Dialogue phase: NPC name label + distinct styling
  if (message.phase === "dialogue" && message.npcName) {
    return (
      <div className="space-y-0">
        {message.rollResult && <DiceRollDisplay roll={message.rollResult} />}
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-violet-800 text-violet-100 flex items-center justify-center text-[10px] font-bold shrink-0">
            NPC
          </div>
          <div className="max-w-[80%] space-y-1">
            <span className="text-xs font-semibold text-violet-400 tracking-wide">
              {message.npcName}
            </span>
            <div className="rounded-lg px-4 py-3 text-sm leading-relaxed bg-muted/70 text-violet-100/90 border border-violet-900/30">
              <TypewriterText text={message.narrative} />
            </div>
          </div>
        </div>
        <KarmaFameBadges message={message} />
      </div>
    );
  }

  // Exploration / default: clean parchment prose
  return (
    <div className="space-y-0">
      {message.rollResult && message.phase !== "skill_check" && (
        <DiceRollDisplay roll={message.rollResult} />
      )}
      <div className="flex gap-3 justify-start">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          DM
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-muted text-foreground">
          <TypewriterText text={message.narrative} />
        </div>
      </div>
      <KarmaFameBadges message={message} />
    </div>
  );
}

function KarmaFameBadges({ message }: { message: ChatMessageType }) {
  const hasKarmaChange = message.karmaChange !== undefined && message.karmaChange !== 0;
  const hasFameChange = message.fameChange !== undefined && message.fameChange !== 0;

  if (!hasKarmaChange && !hasFameChange) return null;

  return (
    <div className="flex gap-2 ml-11 mt-1">
      {hasKarmaChange && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          message.karmaChange! > 0
            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-700/30"
            : "bg-red-950/60 text-red-400 border border-red-700/30"
        }`}>
          {message.karmaChange! > 0 ? "+" : ""}{message.karmaChange} karma
        </span>
      )}
      {hasFameChange && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          message.fameChange! > 0
            ? "bg-sky-950/60 text-sky-400 border border-sky-700/30"
            : "bg-orange-950/60 text-orange-400 border border-orange-700/30"
        }`}>
          {message.fameChange! > 0 ? "+" : ""}{message.fameChange} fame
        </span>
      )}
    </div>
  );
}

/**
 * Typewriter effect — reveals text letter-by-letter at ~1200 WPM
 * using direct DOM manipulation to avoid React re-render batching.
 * 1200 WPM ~ 6000 chars/min ~ 10ms per character.
 */
function TypewriterText({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef(text);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    const cursor = cursorRef.current;
    if (!el || !cursor) return;

    if (textRef.current !== text) {
      textRef.current = text;
      doneRef.current = false;
    }

    if (doneRef.current) {
      el.textContent = text;
      cursor.style.display = "none";
      return;
    }

    if (text.length === 0) {
      el.textContent = text;
      cursor.style.display = "none";
      doneRef.current = true;
      return;
    }

    let charIndex = 0;
    el.textContent = "";
    cursor.style.display = "";

    // 1200 WPM ~ 10ms per character
    const timer = setInterval(() => {
      if (charIndex < text.length) {
        el.textContent += text[charIndex];
        charIndex++;

        // Auto-scroll every 20 chars to reduce layout thrash
        if (charIndex % 20 === 0) {
          const scrollParent = el.closest("[class*='overflow-y']");
          if (scrollParent) {
            scrollParent.scrollTop = scrollParent.scrollHeight;
          }
        }
      } else {
        clearInterval(timer);
        cursor.style.display = "none";
        doneRef.current = true;
        // Final scroll
        const scrollParent = el.closest("[class*='overflow-y']");
        if (scrollParent) {
          scrollParent.scrollTop = scrollParent.scrollHeight;
        }
      }
    }, 10);

    return () => {
      clearInterval(timer);
      if (el) el.textContent = text;
      if (cursor) cursor.style.display = "none";
    };
  }, [text]);

  return (
    <div className="whitespace-pre-wrap">
      <span ref={containerRef} />
      <span
        ref={cursorRef}
        className="inline-block w-0.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom"
      />
    </div>
  );
}
