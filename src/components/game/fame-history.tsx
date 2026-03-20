"use client";

import type { FameEvent } from "@/lib/karma";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/stores/language-store";

interface Props {
  fame: number;
  history: FameEvent[];
  onClose: () => void;
}

const CATEGORY_KEYS: Record<FameEvent["category"], string> = {
  quest: "fame.categoryQuest",
  combat: "fame.categoryCombat",
  crime: "fame.categoryCrime",
  social: "fame.categorySocial",
  decay: "fame.categoryDecay",
};

export function FameHistory({ fame, history, onClose }: Props) {
  const t = useLanguageStore((s) => s.t);

  const fameTier =
    fame >= 75 ? t("fame.legendary") :
    fame >= 50 ? t("fame.renowned") :
    fame >= 30 ? t("fame.wellKnown") :
    fame >= 15 ? t("fame.recognized") :
    t("fame.unknown");

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
          <h2 className="text-lg font-black tracking-tight">{t("fame.historyTitle")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("fame.currentFame")}{" "}
            <span className={cn(
              "font-bold",
              fame >= 75 ? "text-amber-400" :
              fame >= 40 ? "text-sky-400" :
              fame >= 15 ? "text-slate-300" :
              "text-gray-500"
            )}>
              {fame} ({fameTier})
            </span>
          </p>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {history.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              {t("fame.emptyState")}
            </div>
          ) : (
            <ul className="space-y-2">
              {[...history].reverse().map((event, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 text-sm px-3 py-2 rounded-lg border",
                    event.amount > 0
                      ? "bg-sky-950/30 border-sky-800/30"
                      : event.amount < 0
                        ? "bg-orange-950/30 border-orange-800/30"
                        : "bg-muted/30 border-border/20"
                  )}
                >
                  {/* Amount badge */}
                  <span className={cn(
                    "shrink-0 font-mono font-bold text-xs min-w-[40px] text-center py-0.5 rounded",
                    event.amount > 0
                      ? "text-sky-400 bg-sky-950/50"
                      : event.amount < 0
                        ? "text-orange-400 bg-orange-950/50"
                        : "text-gray-400 bg-muted/50"
                  )}>
                    {event.amount > 0 ? "+" : ""}{event.amount}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">{event.reason}</div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {t("fame.turn")} {event.turn}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t(CATEGORY_KEYS[event.category])}
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
