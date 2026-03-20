"use client";

import { useState } from "react";
import { useSaveStore, MANUAL_SLOTS, type SlotId, type SaveSlot } from "@/stores/save-store";
import { captureSnapshot } from "@/lib/save-snapshot";
import { restoreSnapshot } from "@/lib/save-snapshot";
import { useCharacterStore } from "@/stores/character-store";
import { useGameStore } from "@/stores/game-store";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";

interface SaveSlotsModalProps {
  mode: "save" | "load";
  open: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SlotCard({
  slotId,
  slot,
  mode,
  onSave,
  onLoad,
  onDelete,
  slotLabel,
  emptyLabel,
  saveLabel,
  overwriteLabel,
  loadLabel,
  deleteLabel,
}: {
  slotId: SlotId;
  slot: SaveSlot | undefined;
  mode: "save" | "load";
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
  slotLabel: string;
  emptyLabel: string;
  saveLabel: string;
  overwriteLabel: string;
  loadLabel: string;
  deleteLabel: string;
}) {
  const isAuto = slotId === "auto";
  const isEmpty = !slot;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
      {/* Slot info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {slotLabel}
          </span>
          {isAuto && (
            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
              AUTO
            </span>
          )}
        </div>
        {slot ? (
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
            <span className="text-amber-300/70 font-semibold truncate">
              {slot.characterName}
            </span>
            <span className="text-gray-600">&middot;</span>
            <span>Lvl {slot.characterLevel}</span>
            <span className="text-gray-600">&middot;</span>
            <span className="truncate">{slot.location}</span>
            <span className="text-gray-600">&middot;</span>
            <span className="shrink-0">{formatDate(slot.savedAt)}</span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">{emptyLabel}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {mode === "save" && !isAuto && (
          <Button
            size="sm"
            variant={isEmpty ? "default" : "secondary"}
            className="h-7 text-xs px-3"
            onClick={onSave}
          >
            {isEmpty ? saveLabel : overwriteLabel}
          </Button>
        )}
        {mode === "load" && !isEmpty && (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs px-3"
            onClick={onLoad}
          >
            {loadLabel}
          </Button>
        )}
        {!isEmpty && !isAuto && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            {deleteLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SaveSlotsModal({ mode, open, onClose }: SaveSlotsModalProps) {
  const t = useLanguageStore((s) => s.t);
  const { slots, saveToSlot, deleteSlot } = useSaveStore();
  const [confirmDelete, setConfirmDelete] = useState<SlotId | null>(null);
  const character = useCharacterStore((s) => s.character);
  const location = useGameStore((s) => s.location);
  const turnCount = useGameStore((s) => s.turnCount);

  const SLOT_LABELS: Record<SlotId, string> = {
    auto: t("save.autoSave"),
    "slot-1": t("save.slot1"),
    "slot-2": t("save.slot2"),
    "slot-3": t("save.slot3"),
  };

  if (!open) return null;

  function handleSave(slotId: SlotId) {
    const snapshot = captureSnapshot();
    saveToSlot(slotId, {
      savedAt: new Date().toISOString(),
      characterName: character.name,
      characterLevel: character.level,
      location,
      turnCount,
      snapshot,
    });
    onClose();
  }

  function handleLoad(slotId: SlotId) {
    const slot = slots[slotId];
    if (!slot) return;
    restoreSnapshot(slot.snapshot);
    onClose();
  }

  function handleDelete(slotId: SlotId) {
    if (confirmDelete === slotId) {
      deleteSlot(slotId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(slotId);
    }
  }

  const slotsToShow: SlotId[] =
    mode === "save" ? MANUAL_SLOTS : ["auto", ...MANUAL_SLOTS];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal */}
      <div className="w-full max-w-md mx-4 bg-card border border-border/50 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <h2 className="font-cinzel text-lg font-semibold tracking-wide">
            {mode === "save" ? t("save.saveGame") : t("save.loadGame")}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Slots list */}
        <div className="p-4 space-y-2">
          {slotsToShow.map((id) => (
            <SlotCard
              key={id}
              slotId={id}
              slot={slots[id]}
              mode={mode}
              onSave={() => handleSave(id)}
              onLoad={() => handleLoad(id)}
              onDelete={() => handleDelete(id)}
              slotLabel={SLOT_LABELS[id]}
              emptyLabel={t("save.empty")}
              saveLabel={t("save.save")}
              overwriteLabel={t("save.overwrite")}
              loadLabel={t("save.load")}
              deleteLabel={t("save.delete")}
            />
          ))}

          {/* Delete confirmation hint */}
          {confirmDelete && (
            <p className="text-[11px] text-destructive/80 text-center pt-1">
              {t("save.confirmDelete")} {SLOT_LABELS[confirmDelete]}.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/30 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("save.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
