"use client";

import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";

interface StepWelcomeProps {
  onNext: () => void;
  onQuickStart: () => void;
  onSurvey: () => void;
}

export function StepWelcome({ onNext, onQuickStart, onSurvey }: StepWelcomeProps) {
  const t = useLanguageStore((s) => s.t);

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
          {t("welcome.title")}
        </h2>
        <p className="text-sm text-[#8a8a8a] max-w-md mx-auto mt-2">
          {t("welcome.description")}
        </p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#2a2a2a] text-sm space-y-2">
          <p className="font-medium text-[#c9a227] font-cinzel text-xs tracking-wide">{t("welcome.stepsIntro")}</p>
          <ol className="list-decimal list-inside space-y-1 text-[#8a8a8a] text-xs">
            <li>{t("welcome.step1")}</li>
            <li>{t("welcome.step2")}</li>
            <li>{t("welcome.step3")}</li>
            <li>{t("welcome.step4")}</li>
            <li>{t("welcome.step5")}</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-[#6b0000] hover:bg-[#7a0000] text-white border border-[#c9a227] font-cinzel tracking-wide transition-shadow hover:shadow-[0_0_12px_rgba(201,162,39,0.3)]"
            onClick={onNext}
          >
            {t("welcome.createCharacter")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full bg-transparent border-[#444] text-gray-400 hover:border-[#666] hover:text-gray-300 hover:bg-transparent font-cinzel tracking-wide"
            onClick={onSurvey}
          >
            {t("welcome.helpMeChoose")}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-gray-500 hover:text-gray-300 hover:bg-white/5 font-cinzel tracking-wide"
            onClick={onQuickStart}
          >
            {t("welcome.quickStart")}
          </Button>
          <p className="text-[11px] text-[#8a8a8a] text-center">
            {t("welcome.helpText")}
          </p>
        </div>
      </div>
    </div>
  );
}
