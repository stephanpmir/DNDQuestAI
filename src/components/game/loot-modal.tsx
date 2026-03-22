"use client";

import { useState } from "react";
import type { LootState } from "@/types/game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  loot: LootState;
  onComplete: (selectedItems: string[]) => void;
}

export function LootModal({ loot, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleItem(item: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }

  function handleTakeAll() {
    onComplete(loot.items);
  }

  function handleTakeSelected() {
    onComplete(Array.from(selected));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-amber-700/50 bg-zinc-900 p-5 space-y-4 shadow-2xl">
        <h3 className="text-center text-sm font-bold uppercase tracking-widest text-amber-400">
          Loot Found
        </h3>

        {loot.gold != null && loot.gold > 0 && (
          <div className="text-center text-sm text-amber-300 font-semibold">
            {loot.gold} gold
          </div>
        )}

        <div className="space-y-1.5">
          {loot.items.map((item) => (
            <button
              key={item}
              onClick={() => toggleItem(item)}
              className={cn(
                "w-full text-left rounded px-3 py-2 text-sm border transition-colors",
                selected.has(item)
                  ? "border-amber-500/60 bg-amber-950/40 text-amber-200"
                  : "border-muted bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
              )}
            >
              {selected.has(item) ? "* " : "  "}
              {item}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTakeAll}
            className="flex-1 bg-amber-700 hover:bg-amber-600 text-white"
          >
            Take All
          </Button>
          <Button
            onClick={handleTakeSelected}
            disabled={selected.size === 0}
            variant="outline"
            className="flex-1"
          >
            Take Selected ({selected.size})
          </Button>
        </div>
      </div>
    </div>
  );
}
