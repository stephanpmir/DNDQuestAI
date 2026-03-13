"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import { DiceRollDisplay } from "./dice-roll-display";
import { useLanguageStore } from "@/stores/language-store";

const DM_AVATAR_URL = "/.netlify/functions/proxy-portrait?prompt=dragon%20eye%20close%20up%20perfectly%20centered%20slit%20pupil%20gold%20iris%20glowing%20arcane%20dark%20fantasy%20square%20portrait%20symmetrical&seed=666&width=128&height=128";

interface Props {
  message: ChatMessageType;
  avatarUrl?: string;
}

export function ChatMessage({ message, avatarUrl }: Props) {
  const t = useLanguageStore((s) => s.t);
  const isUser = message.role === "user";
  const [dmAvatarError, setDmAvatarError] = useState(false);

  if (isUser) {
    return (
      <div className="space-y-0">
        <div className="flex gap-3 justify-end">
          <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground">
            <div className="whitespace-pre-wrap">{message.narrative}</div>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t("chat.you")}
              className="w-8 h-8 rounded-full object-cover object-top shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              {t("chat.you")}
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasKarmaChange = message.karmaChange !== undefined && message.karmaChange !== 0;
  const hasFameChange = message.fameChange !== undefined && message.fameChange !== 0;

  return (
    <div className="space-y-0">
      {message.rollResult && <DiceRollDisplay roll={message.rollResult} />}
      <div className="flex gap-3 justify-start">
        {dmAvatarError ? (
          <div
            style={{
              width: 48, height: 48, minWidth: 48, borderRadius: "50%",
              boxShadow: "0 0 10px rgba(201,162,39,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "#1a1a1a", fontSize: 20,
            }}
          >
            <span style={{ color: "#c9a227" }}>⚔</span>
          </div>
        ) : (
          <img
            src={DM_AVATAR_URL}
            alt="DM"
            onError={() => setDmAvatarError(true)}
            style={{
              width: 48, height: 48, minWidth: 48, borderRadius: "50%",
              objectFit: "cover", objectPosition: "center",
            }}
          />
        )}
        <div
          style={{
            backgroundColor: "transparent", background: "none",
            borderLeft: "3px solid rgba(201,162,39,0.25)", paddingLeft: 16,
          }}
        >
          <TypewriterText text={message.narrative} />
        </div>
      </div>
      {(hasKarmaChange || hasFameChange) && (
        <div className="flex gap-2 ml-11 mt-1">
          {hasKarmaChange && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              message.karmaChange! > 0
                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-700/30"
                : "bg-red-950/60 text-red-400 border border-red-700/30"
            }`}>
              {message.karmaChange! > 0 ? "+" : ""}{message.karmaChange} {t("chat.karma")}
            </span>
          )}
          {hasFameChange && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              message.fameChange! > 0
                ? "bg-sky-950/60 text-sky-400 border border-sky-700/30"
                : "bg-orange-950/60 text-orange-400 border border-orange-700/30"
            }`}>
              {message.fameChange! > 0 ? "+" : ""}{message.fameChange} {t("chat.fame")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Typewriter effect — reveals text letter-by-letter at ~1600 WPM
 * using direct DOM manipulation to avoid React re-render batching.
 * 1600 WPM ≈ 8000 chars/min ≈ 7.5ms per character.
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

    // 1600 WPM ≈ 7.5ms per character
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
    }, 7.5);

    return () => {
      clearInterval(timer);
      if (el) el.textContent = text;
      if (cursor) cursor.style.display = "none";
    };
  }, [text]);

  return (
    <div
      className="whitespace-pre-wrap"
      style={{
        color: "#e8d5b0", fontStyle: "italic",
        fontFamily: "Georgia, serif", lineHeight: 1.8,
      }}
    >
      <span ref={containerRef} />
      <span
        ref={cursorRef}
        className="inline-block w-0.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom"
      />
    </div>
  );
}
