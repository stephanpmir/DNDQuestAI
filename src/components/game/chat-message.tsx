"use client";

import { useEffect, useRef, useCallback } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import { DiceRollDisplay } from "./dice-roll-display";

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

  return (
    <div className="space-y-0">
      {message.rollResult && <DiceRollDisplay roll={message.rollResult} />}
      <div className="flex gap-3 justify-start">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          DM
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-muted text-foreground">
          <TypewriterText text={message.narrative} />
        </div>
      </div>
    </div>
  );
}

/**
 * Typewriter effect — reveals text word-by-word at ~200 WPM
 * using direct DOM manipulation to avoid React re-render batching.
 */
function TypewriterText({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef(text);
  const doneRef = useRef(false);

  // Split into word tokens: each "word" includes trailing whitespace
  const getTokens = useCallback((t: string): string[] => {
    const tokens: string[] = [];
    let current = "";
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === " " || ch === "\t") {
        current += ch;
      } else if (ch === "\n") {
        current += ch;
        tokens.push(current);
        current = "";
      } else {
        if (current.length > 0 && /\S/.test(current)) {
          tokens.push(current);
          current = ch;
        } else {
          current += ch;
        }
      }
    }
    if (current.length > 0) tokens.push(current);
    return tokens;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    const cursor = cursorRef.current;
    if (!el || !cursor) return;

    // If text changed (shouldn't happen for a message, but safety)
    if (textRef.current !== text) {
      textRef.current = text;
      doneRef.current = false;
    }

    // If already done (re-render without text change), show full text
    if (doneRef.current) {
      el.textContent = text;
      cursor.style.display = "none";
      return;
    }

    // Split text into words (preserving spaces attached to words)
    const words = text.match(/\S+\s*/g) || [];
    if (words.length === 0) {
      el.textContent = text;
      cursor.style.display = "none";
      doneRef.current = true;
      return;
    }

    let wordIndex = 0;
    el.textContent = "";
    cursor.style.display = "";

    // 200 WPM = 1 word every 300ms
    const timer = setInterval(() => {
      if (wordIndex < words.length) {
        el.textContent += words[wordIndex];
        wordIndex++;

        // Auto-scroll to keep cursor visible
        const scrollParent = el.closest("[class*='overflow-y']");
        if (scrollParent) {
          scrollParent.scrollTop = scrollParent.scrollHeight;
        }
      } else {
        clearInterval(timer);
        cursor.style.display = "none";
        doneRef.current = true;
      }
    }, 300);

    return () => {
      clearInterval(timer);
      // On cleanup, show full text so it's not cut off
      if (el) el.textContent = text;
      if (cursor) cursor.style.display = "none";
    };
  }, [text, getTokens]);

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
