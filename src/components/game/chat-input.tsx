"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const t = useLanguageStore((s) => s.t);
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
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
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you do?"
          disabled={disabled}
          rows={2}
          className="resize-none"
        />
        <Button type="submit" disabled={disabled || !value.trim()} className="self-end">
          {disabled ? "..." : t("game.sendAction")}
        </Button>
      </form>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSend("I take a short rest")}
          className="text-xs"
        >
          {t("game.shortRest")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSend("I take a long rest and sleep for the night")}
          className="text-xs"
        >
          {t("game.longRest")}
        </Button>
      </div>
    </div>
  );
}
