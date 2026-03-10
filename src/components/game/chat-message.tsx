"use client";

import { useState, useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import { DiceRollDisplay } from "./dice-roll-display";

interface Props {
  message: ChatMessageType;
}

/** 200 WPM = 300ms per word */
const MS_PER_WORD = 300;

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

/** Types out text word-by-word at ~200 WPM */
function TypewriterText({ text }: { text: string }) {
  const words = text.split(/(\s+)/); // preserve whitespace tokens
  const [visibleCount, setVisibleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Count only actual words (not whitespace) for pacing
  const totalWords = words.filter((w) => w.trim().length > 0).length;

  useEffect(() => {
    mountedRef.current = true;
    let wordIndex = 0;

    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      wordIndex++;
      setVisibleCount(wordIndex);
      if (wordIndex >= words.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, MS_PER_WORD);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [words.length, totalWords]);

  // Show all text once fully typed (or if no words)
  if (visibleCount >= words.length || totalWords === 0) {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  return (
    <div className="whitespace-pre-wrap">
      {words.slice(0, visibleCount).join("")}
      <span className="inline-block w-0.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom" />
    </div>
  );
}
