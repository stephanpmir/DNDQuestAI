"use client";

import type { ChatMessage as ChatMessageType } from "@/types/game";
import { DiceRollDisplay } from "./dice-roll-display";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className="space-y-0">
      {/* Dice roll illustration — centered, above the narrative */}
      {!isUser && message.rollResult && (
        <DiceRollDisplay roll={message.rollResult} />
      )}

      {/* Message bubble */}
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
          <div className="whitespace-pre-wrap">{message.narrative}</div>
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold shrink-0">
            You
          </div>
        )}
      </div>
    </div>
  );
}
