"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StepAppearanceProps {
  description: string;
  onDescriptionChange: (desc: string) => void;
  onGenerate: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepAppearance({
  description,
  onDescriptionChange,
  onGenerate,
  onSkip,
  onBack,
}: StepAppearanceProps) {
  const [focused, setFocused] = useState(false);

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
          Paint a picture of your adventurer. Describe their appearance in your
          own words — as detailed or as simple as you like.
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={5}
            placeholder="e.g. A tall woman with braided silver hair, amber eyes, a scar across her left cheek, and sun-darkened skin from years on the road…"
            className={`w-full resize-none rounded-lg p-3 text-sm text-white placeholder:text-[#555] bg-[#0f0f0f] border transition-colors focus:outline-none ${
              focused ? "border-[#c9a227]" : "border-[#333]"
            }`}
            style={focused ? { boxShadow: "0 0 8px rgba(201,162,39,0.15)" } : undefined}
          />
          <p className="text-xs italic text-[#c9a227]/60 mt-1.5">
            Consider describing: hair color and style, eye color, skin tone, build, height, scars or markings, clothing or armor
          </p>
        </div>

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
