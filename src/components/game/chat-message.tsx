"use client";

import { useState, useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import { DiceRollDisplay } from "./dice-roll-display";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessageType;
}

/** Calculate delay between paragraphs — fast enough for quick readers (~400 WPM) */
function readingDelayMs(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  // ~400 WPM pace, minimum 400ms, max 2000ms per paragraph
  return Math.min(2000, Math.max(400, (wordCount / 400) * 60_000));
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
          <FadeInParagraphs text={message.narrative} />
        </div>
      </div>
    </div>
  );
}

/** Splits DM text into paragraphs and fades each in sequentially at ~200 WPM */
function FadeInParagraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Start showing first paragraph immediately
    setVisibleCount(1);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visibleCount >= paragraphs.length || visibleCount === 0) return;

    const currentParagraph = paragraphs[visibleCount - 1];
    const delay = readingDelayMs(currentParagraph);

    timerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setVisibleCount((c) => c + 1);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visibleCount, paragraphs]);

  // If only one paragraph, no animation needed
  if (paragraphs.length <= 1) {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={cn(
            "transition-opacity duration-500 ease-in",
            i < visibleCount ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
          )}
        >
          {p}
        </p>
      ))}
    </div>
  );
}
