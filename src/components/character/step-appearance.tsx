"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";
import type { AppearanceFields } from "@/types/character";

/** Keys into the AppearanceFields type — labels & placeholders come from i18n */
const APPEARANCE_FIELD_KEYS: (keyof AppearanceFields)[] = [
  "heightSize", "weight", "hairColor", "facialHair",
  "scars", "eyeColor", "lipColor", "clothing", "accessories",
];

interface StepAppearanceProps {
  fields: AppearanceFields;
  onFieldChange: (key: keyof AppearanceFields, value: string) => void;
  onGenerate: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepAppearance({
  fields,
  onFieldChange,
  onGenerate,
  onSkip,
  onBack,
}: StepAppearanceProps) {
  const t = useLanguageStore((s) => s.t);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const filledCount = APPEARANCE_FIELD_KEYS.filter((k) => fields[k].trim()).length;

  return (
    <div
      className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(201,162,39,0.15)" }}
    >
      <div className="px-6 pt-6 pb-3">
        <h2
          className="text-xl font-cinzel font-bold tracking-wide"
          style={{
            background: "linear-gradient(180deg, #f0d060, #c9a227)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("appearance.title")}
        </h2>
        <p className="text-sm text-[#8a8a8a] mt-1">
          {t("appearance.description")}
        </p>
      </div>

      <div className="px-6 pb-6 space-y-3">
        {APPEARANCE_FIELD_KEYS.map((key) => {
          const isFocused = focusedField === key;
          return (
            <div key={key}>
              <label className="block text-xs font-cinzel text-[#c9a227]/80 mb-1 tracking-wide">
                {t(`appearance.${key}`)}
              </label>
              <input
                type="text"
                value={fields[key]}
                onChange={(e) => onFieldChange(key, e.target.value)}
                onFocus={() => setFocusedField(key)}
                onBlur={() => setFocusedField(null)}
                placeholder={t(`appearance.${key}Placeholder`)}
                maxLength={120}
                className={`w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] bg-[#0f0f0f] border transition-colors focus:outline-none ${
                  isFocused ? "border-[#c9a227]" : "border-[#333]"
                }`}
                style={isFocused ? { boxShadow: "0 0 8px rgba(201,162,39,0.15)" } : undefined}
              />
            </div>
          );
        })}

        <p className="text-xs italic text-[#8a8a8a] pt-1">
          {filledCount === 0
            ? t("appearance.allOptional")
            : t("appearance.filledCount").replace("{count}", String(filledCount)).replace("{total}", String(APPEARANCE_FIELD_KEYS.length))}
        </p>

        <div className="space-y-2 pt-2">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
            >
              {t("common.back")}
            </Button>
            <Button
              onClick={onGenerate}
              className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
            >
              {t("appearance.generate")}
            </Button>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-center text-xs text-[#8a8a8a] hover:text-[#c9a227] transition-colors cursor-pointer py-1"
          >
            {t("appearance.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
