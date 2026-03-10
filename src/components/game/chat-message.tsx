"use client";

import { useEffect, useRef } from "react";
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
 * Typewriter effect — reveals text letter-by-letter at ~800 WPM
 * using direct DOM manipulation to avoid React re-render batching.
 * 800 WPM ≈ 4000 chars/min ≈ 15ms per character.
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

    // 800 WPM ≈ 15ms per character
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
    }, 15);

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
