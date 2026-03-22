"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { GamePhase } from "@/types/game";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  gamePhase?: GamePhase;
}

const PHASE_PLACEHOLDERS: Record<GamePhase, string> = {
  exploration: "What do you do?",
  combat: "Your action in combat?",
  skill_check: "Roll to continue...",
  looting: "Choose your loot...",
  dialogue: "What do you say?",
};

export function ChatInput({ onSend, disabled, gamePhase = "exploration" }: Props) {
  const [value, setValue] = useState("");

  const isBlocked = gamePhase === "skill_check" || gamePhase === "looting";
  const isDisabled = disabled || isBlocked;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PHASE_PLACEHOLDERS[gamePhase]}
        disabled={isDisabled}
        rows={2}
        className="resize-none"
      />
      <Button type="submit" disabled={isDisabled || !value.trim()} className="self-end">
        {disabled ? "..." : "Send"}
      </Button>
    </form>
  );
}
