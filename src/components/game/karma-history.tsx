"use client";

import type { KarmaEvent } from "@/lib/karma";
import { cn } from "@/lib/utils";

interface Props {
  karma: number;
  history: KarmaEvent[];
  onClose: () => void;
}

export function KarmaHistory({ karma, history, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[80vw] max-w-lg h-[70vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-muted-foreground hover:text-foreground text-2xl leading-none z-10"
        >
          &times;
        </button>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <h2 className="text-lg font-black tracking-tight">Karma History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current Karma: <span className={cn(
              "font-bold",
              karma > 25 ? "text-emerald-400" :
              karma < -25 ? "text-red-400" :
              "text-gray-400"
            )}>
              {karma > 0 ? "+" : ""}{karma}
            </span>
          </p>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {history.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              No moral actions recorded yet. Your choices will shape your alignment.
            </div>
          ) : (
            <ul className="space-y-2">
              {[...history].reverse().map((event, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 text-sm px-3 py-2 rounded-lg border",
                    event.amount > 0
                      ? "bg-emerald-950/30 border-emerald-800/30"
                      : event.amount < 0
                        ? "bg-red-950/30 border-red-800/30"
                        : "bg-muted/30 border-border/20"
                  )}
                >
                  {/* Amount badge */}
                  <span className={cn(
                    "shrink-0 font-mono font-bold text-xs min-w-[40px] text-center py-0.5 rounded",
                    event.amount > 0
                      ? "text-emerald-400 bg-emerald-950/50"
                      : event.amount < 0
                        ? "text-red-400 bg-red-950/50"
                        : "text-gray-400 bg-muted/50"
                  )}>
                    {event.amount > 0 ? "+" : ""}{event.amount}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">{event.description}</div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Turn {event.turn}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatActionType(event.type)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatActionType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
