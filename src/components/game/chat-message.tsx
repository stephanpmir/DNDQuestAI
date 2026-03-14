"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/game";
import type { DiceBreakdown } from "@/lib/combat-engine";
import { DiceRollDisplay } from "./dice-roll-display";
import { useLanguageStore } from "@/stores/language-store";

const DM_AVATAR_URL = "/.netlify/functions/proxy-portrait?prompt=dragon%20eye%20close%20up%20perfectly%20centered%20slit%20pupil%20gold%20iris%20glowing%20arcane%20dark%20fantasy%20square%20portrait%20symmetrical&seed=666&width=128&height=128";

interface Props {
  message: ChatMessageType;
  avatarUrl?: string;
  onSendMessage?: (message: string) => void;
  onCheckRoll?: (message: string) => void;
  disabled?: boolean;
}

export function ChatMessage({ message, avatarUrl, onSendMessage, onCheckRoll, disabled }: Props) {
  const t = useLanguageStore((s) => s.t);
  const isUser = message.role === "user";
  const isRollResult = message.role === "roll_result";
  const [dmAvatarError, setDmAvatarError] = useState(false);

  // Centered roll result card — not a player or DM message
  if (isRollResult && message.rollResult) {
    return <RollResultCard roll={message.rollResult} check={message.checkRequired} />;
  }

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

  // ── Rules Reference answer — distinct visual style ──────────────
  if (message.rulesAnswer) {
    return (
      <div className="space-y-0">
        <div className="flex gap-3 justify-start">
          <div
            style={{
              width: 48, height: 48, minWidth: 48, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "#1a1a2e", fontSize: 22,
              border: "2px solid rgba(201,162,39,0.3)",
            }}
          >
            <span style={{ lineHeight: 1 }}>📖</span>
          </div>
          <div
            style={{
              backgroundColor: "rgba(20, 20, 40, 0.6)",
              border: "1px solid rgba(201,162,39,0.2)",
              borderRadius: 8,
              padding: "12px 16px",
              maxWidth: "85%",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#c9a227",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Rules Reference
            </div>
            <div
              style={{
                color: "#d4d4d8",
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontStyle: "normal",
                whiteSpace: "pre-wrap",
              }}
            >
              {message.narrative}
            </div>
          </div>
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
            <SceneImage prompt={message.sceneImagePrompt} seed={message.timestamp % 1000000} />
          )}
          <TypewriterText text={message.narrative} />
          {message.combatResult && (
            <CombatRoundCard combatResult={message.combatResult} />
          )}
          {message.checkRequired && onCheckRoll && (
            <SkillCheckRoll
              check={message.checkRequired}
              onRoll={onCheckRoll}
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

  const src = `/.netlify/functions/proxy-portrait?prompt=${encodeURIComponent(prompt)}&width=800&height=450&seed=${seed}`;

  const handleError = () => {
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

function getDifficultyLabel(dc: number): string {
  if (dc <= 9) return "Easy";
  if (dc <= 14) return "Medium";
  if (dc <= 19) return "Hard";
  return "Very Hard";
}

/** Centered roll result card — distinct from DM/player bubbles. */
function RollResultCard({
  roll,
  check,
}: {
  roll: import("@/types/world").RollResult;
  check?: { stat: string; skill: string; dc: number; description: string };
}) {
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimDone(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const passed = roll.success;
  const isCrit = roll.rolled === 20;
  const isFumble = roll.rolled === 1;

  const checkLabel = check
    ? `${check.stat.charAt(0).toUpperCase() + check.stat.slice(1)} (${check.skill})`
    : roll.reason ?? "Ability Check";

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <style>{`
        @keyframes diceReveal {
          0% { opacity: 0; transform: scale(0.6) rotate(-15deg); }
          50% { opacity: 1; transform: scale(1.15) rotate(5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes resultSlam {
          0% { opacity: 0; transform: scale(2); }
          60% { opacity: 1; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "16px 24px",
          borderRadius: 12,
          border: `2px solid ${passed ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          backgroundColor: passed ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
          textAlign: "center",
        }}
      >
        {/* Check label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#c9a227",
            fontFamily: "'Cinzel', serif",
            letterSpacing: "0.05em",
            marginBottom: 8,
          }}
        >
          {checkLabel}
        </div>

        {/* Dice result row */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "monospace",
            color: "#e8d5b0",
            marginBottom: 4,
            animation: "diceReveal 0.6s ease-out both",
          }}
        >
          <span role="img" aria-label="dice">🎲</span>{" "}
          <span style={{ color: isCrit ? "#fbbf24" : isFumble ? "#ef4444" : "#e8d5b0" }}>
            {animDone ? roll.rolled : "?"}
          </span>{" "}
          <span style={{ color: "#8a8a8a" }}>
            {roll.modifier >= 0 ? "+" : ""}{roll.modifier}
          </span>{" "}
          <span style={{ color: "#8a8a8a" }}>=</span>{" "}
          <span style={{ fontWeight: 900, color: "#fff" }}>{animDone ? roll.total : "?"}</span>
        </div>

        {/* DC line */}
        {roll.dc != null && (
          <div style={{ fontSize: 12, color: "#8a8a8a", marginBottom: 10 }}>
            vs DC {roll.dc}
          </div>
        )}

        {/* PASS / FAIL */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: "'Cinzel', serif",
            letterSpacing: "0.1em",
            color: passed ? "#22c55e" : "#ef4444",
            animation: animDone ? "resultSlam 0.3s ease-out both" : undefined,
            opacity: animDone ? 1 : 0,
          }}
        >
          {passed ? "PASS" : "FAIL"}
        </div>

        {/* Crit/fumble callout */}
        {isCrit && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", marginTop: 2 }}>
            NATURAL 20!
          </div>
        )}
        {isFumble && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
            NATURAL 1!
          </div>
        )}
      </div>
    </div>
  );
}

/** Combat round card — displays attack rolls, damage, and enemy HP in a structured card. */
function CombatRoundCard({ combatResult }: { combatResult: NonNullable<ChatMessageType["combatResult"]> }) {
  const db = combatResult.diceBreakdown;

  return (
    <div
      style={{
        marginTop: 12, marginBottom: 8, padding: "12px 16px", borderRadius: 8,
        backgroundColor: "rgba(107,0,0,0.12)",
        border: "1px solid rgba(107,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#c9a227", marginBottom: 8, letterSpacing: "0.05em", fontFamily: "'Cinzel', serif" }}>
        {combatResult.enemyName ? `Combat — ${combatResult.enemyName}` : "Combat Round"}
      </div>

      {/* Player attack */}
      {db.playerAttackRoll && (
        <div style={{ fontSize: 12, marginBottom: 4, color: db.playerAttackRoll.hit ? "#c9a227" : "#6b6b6b" }}>
          <span style={{ fontWeight: 600 }}>Your Attack:</span>{" "}
          d20({db.playerAttackRoll.d20}) + {db.playerAttackRoll.modifier} = {db.playerAttackRoll.total} vs AC {db.playerAttackRoll.targetAC}
          {" — "}
          <span style={{ fontWeight: 700, color: db.playerAttackRoll.crit ? "#c9a227" : db.playerAttackRoll.hit ? "#c9a227" : "#6b6b6b" }}>
            {db.playerAttackRoll.crit ? "CRITICAL HIT!" : db.playerAttackRoll.hit ? "Hit" : "Miss"}
          </span>
        </div>
      )}

      {/* Player damage */}
      {db.playerDamageRoll && db.playerAttackRoll?.hit && (
        <div style={{ fontSize: 12, marginBottom: 4, color: "#c9a227" }}>
          <span style={{ fontWeight: 600 }}>Damage Dealt:</span>{" "}
          {db.playerDamageRoll.finalDamage} {db.playerDamageRoll.damageType}
          {db.playerDamageRoll.resisted && <span style={{ color: "#8a8a8a" }}> (resisted)</span>}
          {db.playerDamageRoll.immune && <span style={{ color: "#6b6b6b" }}> (immune!)</span>}
        </div>
      )}

      {/* Enemy HP remaining */}
      {combatResult.enemyHp !== undefined && combatResult.enemyMaxHp !== undefined && (
        <div style={{ fontSize: 12, marginBottom: 4, color: "#e8d5b0" }}>
          <span style={{ fontWeight: 600 }}>Enemy HP:</span>{" "}
          <span style={{ color: combatResult.enemyHp <= 0 ? "#6b0000" : "#e8d5b0" }}>
            {Math.max(0, combatResult.enemyHp)}/{combatResult.enemyMaxHp}
          </span>
          {combatResult.enemyHp <= 0 && <span style={{ color: "#c9a227", fontWeight: 700 }}> — DEFEATED</span>}
        </div>
      )}

      {/* Enemy attack */}
      {db.enemyAttackRoll && (
        <div style={{ fontSize: 12, marginBottom: 4, color: db.enemyAttackRoll.hit ? "#b91c1c" : "#6b6b6b" }}>
          <span style={{ fontWeight: 600 }}>Enemy {db.enemyAttackRoll.attackName}:</span>{" "}
          d20({db.enemyAttackRoll.d20}) + {db.enemyAttackRoll.modifier} = {db.enemyAttackRoll.total} vs AC {db.enemyAttackRoll.targetAC}
          {" — "}
          <span style={{ fontWeight: 700, color: db.enemyAttackRoll.crit ? "#ef4444" : db.enemyAttackRoll.hit ? "#b91c1c" : "#6b6b6b" }}>
            {db.enemyAttackRoll.crit ? "CRITICAL HIT!" : db.enemyAttackRoll.hit ? "Hit" : "Miss"}
          </span>
        </div>
      )}

      {/* Enemy damage */}
      {db.enemyDamageRoll && db.enemyAttackRoll?.hit && (
        <div style={{ fontSize: 12, marginBottom: 4, color: "#b91c1c" }}>
          <span style={{ fontWeight: 600 }}>Damage Taken:</span>{" "}
          {db.enemyDamageRoll.total} {db.enemyDamageRoll.damageType}
        </div>
      )}

      {/* Combat over indicator */}
      {combatResult.combatOver && combatResult.combatEndReason !== "ongoing" && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(201,162,39,0.15)",
          fontSize: 12, fontWeight: 700,
          color: combatResult.combatEndReason === "enemy_killed" ? "#c9a227" : "#b91c1c",
        }}>
          {combatResult.combatEndReason === "enemy_killed" && "Victory!"}
          {combatResult.combatEndReason === "player_fled" && "Fled from combat"}
          {combatResult.combatEndReason === "player_down" && "You have fallen..."}
        </div>
      )}
    </div>
  );
}

/** Dice roll UI for DM-requested skill checks.
 *  No client-side rolling — sends structured params so the server rolls. */
function SkillCheckRoll({
  check,
  onRoll,
  disabled,
}: {
  check: { stat: string; skill: string; dc: number; description: string };
  onRoll: (message: string) => void;
  disabled?: boolean;
}) {
  const [rolled, setRolled] = useState(false);

  const diffLabel = getDifficultyLabel(check.dc);

  const handleRoll = () => {
    if (rolled || disabled) return;
    setRolled(true);
    // Send structured message for server-side rolling
    onRoll(`[CHECK_ROLL:${check.skill}|${check.stat}|${check.dc}]`);
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
