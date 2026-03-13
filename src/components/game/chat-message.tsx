"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import type { AbilityScores } from "@/types/character";
import { DiceRollDisplay } from "./dice-roll-display";
import { useLanguageStore } from "@/stores/language-store";

const DM_AVATAR_URL = "/.netlify/functions/proxy-portrait?prompt=dragon%20eye%20close%20up%20perfectly%20centered%20slit%20pupil%20gold%20iris%20glowing%20arcane%20dark%20fantasy%20square%20portrait%20symmetrical&seed=666&width=128&height=128";

interface Props {
  message: ChatMessageType;
  avatarUrl?: string;
  abilityScores?: AbilityScores;
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

export function ChatMessage({ message, avatarUrl, abilityScores, onSendMessage, disabled }: Props) {
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
          {message.sceneImagePrompt && (
            <SceneImage prompt={message.sceneImagePrompt} seed={message.timestamp} />
          )}
          <TypewriterText text={message.narrative} />
          {message.checkRequired && abilityScores && onSendMessage && (
            <SkillCheckRoll
              check={message.checkRequired}
              abilityScores={abilityScores}
              onRoll={onSendMessage}
              disabled={disabled}
            />
          )}
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

/** Scene image rendered above DM narrative text. Retries once on failure. */
function SceneImage({ prompt, seed }: { prompt: string; seed: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retried, setRetried] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const fullPrompt = `environment landscape ${prompt} no people wide shot dark fantasy`;
  const src = `/.netlify/functions/proxy-portrait?prompt=${encodeURIComponent(fullPrompt)}&width=800&height=450&seed=${seed}`;

  console.log("[SceneImage] src:", src);

  const handleError = () => {
    console.warn("[SceneImage] image load failed, retried:", retried);
    if (!retried) {
      setRetried(true);
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = src + "&retry=1";
        }
      }, 2000);
    } else {
      setError(true);
    }
  };

  return (
    <div
      style={{
        position: "relative", width: "100%",
        aspectRatio: "16/9",
        borderRadius: 8, overflow: "hidden", marginBottom: 12,
        backgroundColor: "#1a1a1a",
        animation: !loaded && !error ? "scenePulse 2s ease-in-out infinite" : undefined,
      }}
    >
      {/* Inline keyframes for pulse animation */}
      {!loaded && !error && (
        <style>{`@keyframes scenePulse { 0%, 100% { background-color: #1a1a1a; } 50% { background-color: #222222; } }`}</style>
      )}
      {/* Always-visible placeholder until image loads or errors */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#555", fontSize: 13, fontStyle: "italic",
        }}>
          {error ? "Scene unavailable" : "Loading scene\u2026"}
        </div>
      )}
      {!loaded && !error && (
        <div className="animate-shimmer" style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 25%, rgba(212,175,55,0.08) 50%, transparent 75%)",
          backgroundSize: "200% 100%",
        }} />
      )}
      {!error && (
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={handleError}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            borderRadius: 8,
            display: loaded ? "block" : "none",
          }}
        />
      )}
    </div>
  );
}

/** Map stat name to the matching abilityScores key */
const STAT_KEY_MAP: Record<string, keyof AbilityScores> = {
  strength: "strength", dexterity: "dexterity", constitution: "constitution",
  wisdom: "wisdom", intelligence: "intelligence", charisma: "charisma",
};

function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getDifficultyLabel(dc: number): string {
  if (dc <= 9) return "Easy";
  if (dc <= 14) return "Medium";
  if (dc <= 19) return "Hard";
  return "Very Hard";
}

/** Dice roll UI for DM-requested skill checks. */
function SkillCheckRoll({
  check,
  abilityScores,
  onRoll,
  disabled,
}: {
  check: { stat: string; skill: string; dc: number; description: string };
  abilityScores: AbilityScores;
  onRoll: (message: string) => void;
  disabled?: boolean;
}) {
  const [rolled, setRolled] = useState(false);

  const statKey = STAT_KEY_MAP[check.stat.toLowerCase()];
  const score = statKey ? abilityScores[statKey] : 10;
  const modifier = getAbilityModifier(score);
  const diffLabel = getDifficultyLabel(check.dc);

  const handleRoll = () => {
    if (rolled || disabled) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + modifier;
    setRolled(true);
    onRoll(`${check.skill} check result: ${total} (rolled ${d20} + ${modifier >= 0 ? "+" : ""}${modifier})`);
  };

  return (
    <div
      style={{
        marginTop: 12, padding: "12px 16px", borderRadius: 8,
        backgroundColor: "rgba(201,162,39,0.08)",
        border: "1px solid rgba(201,162,39,0.2)",
      }}
    >
      <div style={{ fontSize: 13, color: "#c9a227", fontWeight: 600, marginBottom: 4 }}>
        {check.stat} ({check.skill}) — {diffLabel}
      </div>
      <div style={{ fontSize: 12, color: "#8a8a8a", marginBottom: 8 }}>
        {check.description}
      </div>
      <button
        type="button"
        onClick={handleRoll}
        disabled={rolled || disabled}
        style={{
          padding: "6px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700,
          fontFamily: "'Cinzel', serif", letterSpacing: "0.05em",
          backgroundColor: rolled ? "#333" : "#6b0000",
          color: rolled ? "#888" : "#fff",
          border: rolled ? "1px solid #444" : "1px solid #c9a227",
          cursor: rolled || disabled ? "default" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {rolled ? "Rolled" : "Roll d20"}
      </button>
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
