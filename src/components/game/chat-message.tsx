"use client";

import type { ChatMessage as ChatMessageType } from "@/types/game";
import type { RollResult } from "@/types/world";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessageType;
}

function DiceRollBadge({ roll }: { roll: RollResult }) {
  const label = roll.type === "attack" ? "ATK"
    : roll.type === "save" ? "SAVE"
    : roll.type === "damage" ? "DMG"
    : "CHECK";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border mb-2",
        roll.success
          ? "bg-emerald-950/50 border-emerald-700/50 text-emerald-300"
          : "bg-red-950/50 border-red-700/50 text-red-300"
      )}
    >
      <span className="font-bold">{label}</span>
      <span className="text-muted-foreground">
        d20({roll.rolled}) {roll.modifier >= 0 ? "+" : ""}{roll.modifier} = {roll.total}
      </span>
      {roll.dc && (
        <span className="text-muted-foreground">vs DC {roll.dc}</span>
      )}
      <span className="font-bold">
        {roll.success ? "HIT" : "MISS"}
      </span>
    </div>
  );
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          DM
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {!isUser && message.rollResult && (
          <DiceRollBadge roll={message.rollResult} />
        )}
        <div className="whitespace-pre-wrap">{message.narrative}</div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          You
        </div>
      )}
    </div>
  );
}
