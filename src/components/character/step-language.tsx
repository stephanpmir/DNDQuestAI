"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const COMMON_LANGUAGES = [
  "English",
  "Español",
  "Français",
  "Deutsch",
  "Português",
  "Italiano",
  "日本語",
  "中文",
  "한국어",
  "Русский",
  "العربية",
  "हिन्दी",
  "ไทย",
  "Türkçe",
  "Nederlands",
  "Polski",
  "Svenska",
];

interface StepLanguageProps {
  selectedLanguage: string;
  onSelect: (language: string) => void;
  isTranslating: boolean;
}

export function StepLanguage({ selectedLanguage, onSelect, isTranslating }: StepLanguageProps) {
  const [customLang, setCustomLang] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div
      className="rounded-lg border border-[#c9a227] bg-[#111111] overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(201,162,39,0.15)" }}
    >
      <div className="text-center px-6 pt-6 pb-4">
        <h2
          className="text-2xl font-cinzel font-bold tracking-wide"
          style={{
            background: "linear-gradient(180deg, #f0d060, #c9a227)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Language / Idioma / 言語
        </h2>
        <p className="text-sm text-[#8a8a8a] max-w-md mx-auto mt-2">
          Choose the language for your adventure. All text and the Dungeon Master will use this language.
        </p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Language grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMMON_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              disabled={isTranslating}
              onClick={() => onSelect(lang)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                selectedLanguage === lang
                  ? "border-[#c9a227] bg-[#c9a227]/10 text-[#f0d060]"
                  : "border-[#333] bg-[#0f0f0f] text-gray-400 hover:border-[#555] hover:text-gray-300"
              } ${isTranslating ? "opacity-50 cursor-wait" : ""}`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Custom language input */}
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="w-full text-center text-xs text-[#8a8a8a] hover:text-[#c9a227] transition-colors cursor-pointer py-1"
          >
            Don&apos;t see your language? Type it in
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              placeholder="Type your language..."
              maxLength={50}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] bg-[#0f0f0f] border border-[#333] focus:border-[#c9a227] focus:outline-none transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && customLang.trim()) {
                  onSelect(customLang.trim());
                }
              }}
            />
            <Button
              onClick={() => {
                if (customLang.trim()) onSelect(customLang.trim());
              }}
              disabled={!customLang.trim() || isTranslating}
              className="bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide"
            >
              Set
            </Button>
          </div>
        )}

        {/* Loading indicator */}
        {isTranslating && (
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-[#c9a227]/60 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#c9a227]/80 italic">Translating interface...</span>
          </div>
        )}
      </div>
    </div>
  );
}
