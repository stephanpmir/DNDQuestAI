"use client";

import type { AvatarCustomization, HairStyle, BodyBuild, HeightOption } from "@/types/character";
import { HAIR_STYLES, HAIR_COLORS, SKIN_TONES, BODY_BUILDS, HEIGHT_OPTIONS } from "@/types/character";

interface Props {
  avatar: AvatarCustomization;
  onChange: (updates: Partial<AvatarCustomization>) => void;
}

const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: "Short",
  long: "Long",
  ponytail: "Ponytail",
  mohawk: "Mohawk",
  bald: "Bald",
  braids: "Braids",
};

const BUILD_LABELS: Record<BodyBuild, string> = {
  slim: "Slim",
  average: "Average",
  muscular: "Muscular",
  heavy: "Heavy",
};

const HEIGHT_LABELS: Record<HeightOption, string> = {
  short: "Short",
  average: "Average",
  tall: "Tall",
};

function ColorSwatch({
  color,
  selected,
  label,
  onClick,
}: {
  color: string;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`w-6 h-6 rounded-full border-2 transition-transform ${
        selected ? "border-primary scale-125" : "border-transparent hover:scale-110"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

function PillSelect<T extends string>({
  options,
  value,
  labels,
  onChange,
}: {
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
            value === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/30 border-border/30 hover:bg-muted/60"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function AvatarCustomizer({ avatar, onChange }: Props) {
  return (
    <div className="space-y-3 text-xs">
      {/* Hair Style */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Hair Style</p>
        <PillSelect
          options={HAIR_STYLES}
          value={avatar.hairStyle}
          labels={HAIR_STYLE_LABELS}
          onChange={(v) => onChange({ hairStyle: v })}
        />
      </div>

      {/* Hair Color */}
      {avatar.hairStyle !== "bald" && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Hair Color</p>
          <div className="flex flex-wrap gap-1.5">
            {HAIR_COLORS.map((c) => (
              <ColorSwatch
                key={c.value}
                color={c.value}
                selected={avatar.hairColor === c.value}
                label={c.name}
                onClick={() => onChange({ hairColor: c.value })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Skin Tone */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Skin Tone</p>
        <div className="flex flex-wrap gap-1.5">
          {SKIN_TONES.map((c) => (
            <ColorSwatch
              key={c.value}
              color={c.value}
              selected={avatar.skinTone === c.value}
              label={c.name}
              onClick={() => onChange({ skinTone: c.value })}
            />
          ))}
        </div>
      </div>

      {/* Body Build */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Build</p>
        <PillSelect
          options={BODY_BUILDS}
          value={avatar.bodyBuild}
          labels={BUILD_LABELS}
          onChange={(v) => onChange({ bodyBuild: v })}
        />
      </div>

      {/* Height */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Height</p>
        <PillSelect
          options={HEIGHT_OPTIONS}
          value={avatar.height}
          labels={HEIGHT_LABELS}
          onChange={(v) => onChange({ height: v })}
        />
      </div>
    </div>
  );
}
