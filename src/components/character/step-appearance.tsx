"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppearanceFields } from "@/types/character";

interface FieldConfig {
  key: keyof AppearanceFields;
  label: string;
  placeholder: string;
}

const APPEARANCE_FIELD_CONFIG: FieldConfig[] = [
  { key: "heightSize", label: "Height / Size", placeholder: "e.g. Tall and imposing, 6'2\"" },
  { key: "weight", label: "Weight / Build", placeholder: "e.g. Lean and wiry, 160 lbs" },
  { key: "hairColor", label: "Hair Color & Style", placeholder: "e.g. Long silver hair, braided" },
  { key: "facialHair", label: "Facial Hair & Color", placeholder: "e.g. Thick auburn beard, neatly trimmed" },
  { key: "scars", label: "Scars & Markings", placeholder: "e.g. A jagged scar across the left cheek" },
  { key: "eyeColor", label: "Eye Color", placeholder: "e.g. Piercing amber eyes" },
  { key: "lipColor", label: "Lip Color", placeholder: "e.g. Pale, thin lips" },
  { key: "clothing", label: "Clothing & Armor", placeholder: "e.g. Worn leather armor with a dark green cloak" },
  { key: "accessories", label: "Accessories", placeholder: "e.g. A silver pendant, iron rings on both hands" },
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const filledCount = APPEARANCE_FIELD_CONFIG.filter((f) => fields[f.key].trim()).length;

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
          Describe Your Hero
        </h2>
        <p className="text-sm text-[#8a8a8a] mt-1">
          Fill in as many or as few details as you like. Your race, class, and
          gender are already part of the portrait — these fields add the
          finishing touches.
        </p>
      </div>

      <div className="px-6 pb-6 space-y-3">
        {APPEARANCE_FIELD_CONFIG.map(({ key, label, placeholder }) => {
          const isFocused = focusedField === key;
          return (
            <div key={key}>
              <label className="block text-xs font-cinzel text-[#c9a227]/80 mb-1 tracking-wide">
                {label}
              </label>
              <input
                type="text"
                value={fields[key]}
                onChange={(e) => onFieldChange(key, e.target.value)}
                onFocus={() => setFocusedField(key)}
                onBlur={() => setFocusedField(null)}
                placeholder={placeholder}
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
            ? "All fields are optional — fill in what matters to you."
            : `${filledCount} of ${APPEARANCE_FIELD_CONFIG.length} details filled in.`}
        </p>

        <div className="space-y-2 pt-2">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent"
            >
              Back
            </Button>
            <Button
              onClick={onGenerate}
              className="flex-1 bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
            >
              Generate My Portrait
            </Button>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-center text-xs text-[#8a8a8a] hover:text-[#c9a227] transition-colors cursor-pointer py-1"
          >
            Skip — Use Random Portrait
          </button>
        </div>
      </div>
    </div>
  );
}
