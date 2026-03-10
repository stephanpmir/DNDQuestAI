"use client";

import type { Race, CharacterClass, Gender, AvatarCustomization, BodyBuild, HeightOption, HairStyle } from "@/types/character";

/**
 * Race body-type groupings for the silhouette base shape.
 * Each group shares a torso/leg proportion.
 */
type BodyType = "standard" | "tall" | "short" | "stocky" | "large";

const RACE_BODY: Record<Race, BodyType> = {
  Human: "standard",
  "Half-Elf": "standard",
  Elf: "tall",
  Halfling: "short",
  Gnome: "short",
  Dwarf: "stocky",
  "Half-Orc": "large",
  Dragonborn: "large",
  Tiefling: "standard",
};

/** Accent color per class for the weapon / accessory glow */
export const CLASS_ACCENT: Record<CharacterClass, string> = {
  Barbarian: "#ef4444",
  Bard: "#f59e0b",
  Cleric: "#fbbf24",
  Druid: "#22c55e",
  Fighter: "#94a3b8",
  Monk: "#f59e0b",
  Paladin: "#facc15",
  Ranger: "#22c55e",
  Rogue: "#a78bfa",
  Sorcerer: "#f472b6",
  Warlock: "#8b5cf6",
  Wizard: "#60a5fa",
};

interface Props {
  race: Race;
  characterClass: CharacterClass;
  gender: Gender;
  avatar?: AvatarCustomization;
}

/* ─── Body config helpers ─── */

interface BodyConfig {
  headY: number;
  headR: number;
  shoulderW: number;
  hipW: number;
  torsoH: number;
  legH: number;
  armLen: number;
}

/** Build multipliers for shoulder/hip width */
const BUILD_SCALE: Record<BodyBuild, { shoulder: number; hip: number; armW: number }> = {
  slim:     { shoulder: 0.85, hip: 0.85, armW: 0.8 },
  average:  { shoulder: 1.0,  hip: 1.0,  armW: 1.0 },
  muscular: { shoulder: 1.15, hip: 1.05, armW: 1.3 },
  heavy:    { shoulder: 1.1,  hip: 1.2,  armW: 1.2 },
};

/** Height offsets: shifts headY up/down and scales torso+legs */
const HEIGHT_SCALE: Record<HeightOption, { yOffset: number; torsoMul: number; legMul: number }> = {
  short:   { yOffset: 15, torsoMul: 0.88, legMul: 0.85 },
  average: { yOffset: 0,  torsoMul: 1.0,  legMul: 1.0 },
  tall:    { yOffset: -8, torsoMul: 1.08, legMul: 1.1 },
};

function getBodyConfig(
  body: BodyType,
  gender: Gender,
  build: BodyBuild,
  height: HeightOption,
): BodyConfig {
  const isFemale = gender === "Female";

  const base = {
    standard: { headY: 55, headR: 28, shoulderW: 40, hipW: isFemale ? 36 : 32, torsoH: 70, legH: 90, armLen: 85 },
    tall:     { headY: 45, headR: 26, shoulderW: 38, hipW: isFemale ? 32 : 28, torsoH: 80, legH: 100, armLen: 95 },
    short:    { headY: 85, headR: 26, shoulderW: 34, hipW: isFemale ? 32 : 28, torsoH: 55, legH: 60, armLen: 60 },
    stocky:   { headY: 75, headR: 28, shoulderW: 46, hipW: isFemale ? 40 : 38, torsoH: 60, legH: 65, armLen: 65 },
    large:    { headY: 50, headR: 30, shoulderW: 48, hipW: isFemale ? 40 : 38, torsoH: 75, legH: 90, armLen: 90 },
  }[body];

  const bs = BUILD_SCALE[build];
  const hs = HEIGHT_SCALE[height];

  return {
    headY: base.headY + hs.yOffset,
    headR: base.headR,
    shoulderW: Math.round(base.shoulderW * bs.shoulder),
    hipW: Math.round(base.hipW * bs.hip),
    torsoH: Math.round(base.torsoH * hs.torsoMul),
    legH: Math.round(base.legH * hs.legMul),
    armLen: Math.round(base.armLen * hs.legMul),
  };
}

/* ─── SVG sub-components (all draw inside a 200×320 viewBox) ─── */

function BaseTorso({
  cfg,
  gender,
  skinTone,
  buildArmW,
}: {
  cfg: BodyConfig;
  gender: Gender;
  skinTone: string;
  buildArmW: number;
}) {
  const isFemale = gender === "Female";
  const cx = 100;
  const { headY, headR, shoulderW, hipW, torsoH, legH, armLen } = cfg;
  const shoulderY = headY + headR + 4 + 8;
  const hipY = shoulderY + torsoH;
  const feetY = hipY + legH;

  const waistW = isFemale ? shoulderW - 10 : shoulderW - 4;
  const waistY = shoulderY + torsoH * 0.45;

  // Arm thickness scales with build
  const armSpread = Math.round(14 * buildArmW);
  const armInner = Math.round(10 * buildArmW);

  return (
    <g fill={skinTone}>
      {/* Head */}
      <ellipse cx={cx} cy={headY} rx={headR} ry={headR + 2} />

      {/* Neck */}
      <rect x={cx - 8} y={headY + headR} width={16} height={10} rx={3} />

      {/* Torso */}
      <path
        d={`
          M ${cx - shoulderW} ${shoulderY}
          Q ${cx - waistW} ${waistY}, ${cx - hipW} ${hipY}
          L ${cx + hipW} ${hipY}
          Q ${cx + waistW} ${waistY}, ${cx + shoulderW} ${shoulderY}
          Z
        `}
      />

      {/* Left arm */}
      <path
        d={`
          M ${cx - shoulderW} ${shoulderY}
          Q ${cx - shoulderW - armSpread} ${shoulderY + armLen * 0.5}, ${cx - shoulderW - 6} ${shoulderY + armLen}
          L ${cx - shoulderW + 4} ${shoulderY + armLen}
          Q ${cx - shoulderW - 4} ${shoulderY + armLen * 0.5}, ${cx - shoulderW + armInner} ${shoulderY}
          Z
        `}
      />

      {/* Right arm */}
      <path
        d={`
          M ${cx + shoulderW} ${shoulderY}
          Q ${cx + shoulderW + armSpread} ${shoulderY + armLen * 0.5}, ${cx + shoulderW + 6} ${shoulderY + armLen}
          L ${cx + shoulderW - 4} ${shoulderY + armLen}
          Q ${cx + shoulderW + 4} ${shoulderY + armLen * 0.5}, ${cx + shoulderW - armInner} ${shoulderY}
          Z
        `}
      />

      {/* Left leg */}
      <path
        d={`
          M ${cx - hipW} ${hipY}
          L ${cx - hipW - 4} ${feetY}
          L ${cx - 4} ${feetY}
          L ${cx - 4} ${hipY}
          Z
        `}
      />

      {/* Right leg */}
      <path
        d={`
          M ${cx + hipW} ${hipY}
          L ${cx + hipW + 4} ${feetY}
          L ${cx + 4} ${feetY}
          L ${cx + 4} ${hipY}
          Z
        `}
      />

      {/* Boots — slightly darker than skin */}
      <ellipse cx={cx - hipW / 2 - 2} cy={feetY + 3} rx={hipW / 2 + 4} ry={5} fill="#3d3224" />
      <ellipse cx={cx + hipW / 2 + 2} cy={feetY + 3} rx={hipW / 2 + 4} ry={5} fill="#3d3224" />
    </g>
  );
}

function HairLayer({
  hairStyle,
  hairColor,
  headY,
  headR,
}: {
  hairStyle: HairStyle;
  hairColor: string;
  headY: number;
  headR: number;
}) {
  const cx = 100;

  if (hairStyle === "bald") return null;

  switch (hairStyle) {
    case "short":
      return (
        <g fill={hairColor}>
          {/* Cap-like short hair */}
          <ellipse cx={cx} cy={headY - 6} rx={headR + 2} ry={headR - 6} />
          {/* Slight side coverage */}
          <rect x={cx - headR - 1} y={headY - 10} width={4} height={14} rx={2} />
          <rect x={cx + headR - 3} y={headY - 10} width={4} height={14} rx={2} />
        </g>
      );

    case "long":
      return (
        <g fill={hairColor}>
          {/* Top volume */}
          <ellipse cx={cx} cy={headY - 8} rx={headR + 4} ry={headR - 4} />
          {/* Left drape */}
          <path
            d={`M ${cx - headR - 3} ${headY - 6}
                Q ${cx - headR - 8} ${headY + 30}, ${cx - headR + 2} ${headY + 56}
                L ${cx - headR + 8} ${headY + 50}
                Q ${cx - headR - 2} ${headY + 20}, ${cx - headR + 2} ${headY - 2}
                Z`}
          />
          {/* Right drape */}
          <path
            d={`M ${cx + headR + 3} ${headY - 6}
                Q ${cx + headR + 8} ${headY + 30}, ${cx + headR - 2} ${headY + 56}
                L ${cx + headR - 8} ${headY + 50}
                Q ${cx + headR + 2} ${headY + 20}, ${cx + headR - 2} ${headY - 2}
                Z`}
          />
        </g>
      );

    case "ponytail":
      return (
        <g fill={hairColor}>
          {/* Cap */}
          <ellipse cx={cx} cy={headY - 6} rx={headR + 2} ry={headR - 6} />
          {/* Ponytail going back-right */}
          <path
            d={`M ${cx + 6} ${headY - headR + 6}
                Q ${cx + 28} ${headY - headR - 4}, ${cx + 30} ${headY + 10}
                Q ${cx + 32} ${headY + 30}, ${cx + 24} ${headY + 44}
                L ${cx + 18} ${headY + 40}
                Q ${cx + 24} ${headY + 24}, ${cx + 22} ${headY + 8}
                Q ${cx + 20} ${headY - headR + 4}, ${cx + 4} ${headY - headR + 8}
                Z`}
          />
        </g>
      );

    case "mohawk":
      return (
        <g fill={hairColor}>
          {/* Central ridge */}
          <path
            d={`M ${cx - 6} ${headY + 4}
                Q ${cx - 8} ${headY - headR - 4}, ${cx} ${headY - headR - 18}
                Q ${cx + 8} ${headY - headR - 4}, ${cx + 6} ${headY + 4}
                Z`}
          />
        </g>
      );

    case "braids":
      return (
        <g fill={hairColor}>
          {/* Top volume */}
          <ellipse cx={cx} cy={headY - 6} rx={headR + 2} ry={headR - 6} />
          {/* Left braid */}
          <path
            d={`M ${cx - headR} ${headY}
                L ${cx - headR - 4} ${headY + 16}
                L ${cx - headR} ${headY + 30}
                L ${cx - headR - 4} ${headY + 44}
                L ${cx - headR + 2} ${headY + 50}
                L ${cx - headR + 4} ${headY + 44}
                L ${cx - headR} ${headY + 30}
                L ${cx - headR + 4} ${headY + 16}
                Z`}
          />
          {/* Right braid */}
          <path
            d={`M ${cx + headR} ${headY}
                L ${cx + headR + 4} ${headY + 16}
                L ${cx + headR} ${headY + 30}
                L ${cx + headR + 4} ${headY + 44}
                L ${cx + headR - 2} ${headY + 50}
                L ${cx + headR - 4} ${headY + 44}
                L ${cx + headR} ${headY + 30}
                L ${cx + headR - 4} ${headY + 16}
                Z`}
          />
        </g>
      );

    default:
      return null;
  }
}

/** Darken a hex color by a factor (0–1, where 0 = black) */
function darkenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = Math.max(0, Math.min(1, factor));
  return `#${Math.round(r * f).toString(16).padStart(2, "0")}${Math.round(g * f).toString(16).padStart(2, "0")}${Math.round(b * f).toString(16).padStart(2, "0")}`;
}

function RacialFeatures({
  race, headY, headR, skinTone, hairColor, hipY,
}: {
  race: Race; headY: number; headR: number; skinTone: string; hairColor: string; hipY: number;
}) {
  const cx = 100;

  switch (race) {
    case "Elf":
    case "Half-Elf":
      return (
        <g fill={skinTone}>
          <polygon points={`${cx - headR - 2},${headY - 2} ${cx - headR - 18},${headY - 16} ${cx - headR + 2},${headY + 8}`} />
          <polygon points={`${cx + headR + 2},${headY - 2} ${cx + headR + 18},${headY - 16} ${cx + headR - 2},${headY + 8}`} />
        </g>
      );

    case "Dwarf":
      // Beard uses hair color so it's visible against skin
      return (
        <g fill={hairColor} opacity={0.85}>
          <path d={`M ${cx - 16} ${headY + 10} Q ${cx - 20} ${headY + 40}, ${cx} ${headY + 48} Q ${cx + 20} ${headY + 40}, ${cx + 16} ${headY + 10}`} />
        </g>
      );

    case "Half-Orc":
      return (
        <g fill="#e8e0d0">
          <rect x={cx - 18} y={headY + headR - 8} width={5} height={12} rx={2} opacity={0.8} />
          <rect x={cx + 13} y={headY + headR - 8} width={5} height={12} rx={2} opacity={0.8} />
        </g>
      );

    case "Tiefling": {
      // Tail positioned relative to hip, not hardcoded
      const tailStartY = hipY - 10;
      return (
        <g>
          <path d={`M ${cx - 14} ${headY - headR + 4} Q ${cx - 26} ${headY - headR - 20}, ${cx - 30} ${headY - headR - 30}`}
            fill="none" stroke="#5c1a1a" strokeWidth={4} strokeLinecap="round" />
          <path d={`M ${cx + 14} ${headY - headR + 4} Q ${cx + 26} ${headY - headR - 20}, ${cx + 30} ${headY - headR - 30}`}
            fill="none" stroke="#5c1a1a" strokeWidth={4} strokeLinecap="round" />
          <path d={`M ${cx + 30} ${tailStartY} Q ${cx + 55} ${tailStartY + 30}, ${cx + 50} ${tailStartY + 60} Q ${cx + 45} ${tailStartY + 80}, ${cx + 60} ${tailStartY + 70}`}
            fill="none" stroke={skinTone} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    }

    case "Dragonborn": {
      // Ridges use a darkened skin tone so they're visible on the head
      const ridgeColor = darkenHex(skinTone, 0.6);
      return (
        <g>
          {/* Snout */}
          <path d={`M ${cx - 10} ${headY + 4} L ${cx} ${headY + 18} L ${cx + 10} ${headY + 4}`} fill={ridgeColor} opacity={0.8} />
          {/* Head ridges */}
          <path d={`M ${cx - 8} ${headY - headR} L ${cx - 4} ${headY - headR - 14}`}
            fill="none" stroke={ridgeColor} strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${cx} ${headY - headR} L ${cx} ${headY - headR - 16}`}
            fill="none" stroke={ridgeColor} strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${cx + 8} ${headY - headR} L ${cx + 4} ${headY - headR - 14}`}
            fill="none" stroke={ridgeColor} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    }

    case "Gnome":
      // Hat uses a distinct muted color, not skin tone
      return (
        <g fill="#6b5b4f" opacity={0.7}>
          <polygon points={`${cx - headR + 2},${headY - headR + 4} ${cx},${headY - headR - 28} ${cx + headR - 2},${headY - headR + 4}`} />
        </g>
      );

    case "Halfling":
      // Curly sideburn puffs in hair color (always shown, independent of HairLayer)
      return (
        <g fill={hairColor} opacity={0.7}>
          <circle cx={cx - headR + 2} cy={headY + 4} r={7} />
          <circle cx={cx + headR - 2} cy={headY + 4} r={7} />
        </g>
      );

    default:
      return null;
  }
}

function ClassAccessory({ characterClass, accent }: { characterClass: CharacterClass; accent: string }) {
  const hx = 152;
  const hy = 165;

  switch (characterClass) {
    case "Barbarian":
      return (
        <g>
          <line x1={hx} y1={hy - 10} x2={hx + 8} y2={hy + 60} stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${hx + 2} ${hy - 10} Q ${hx + 22} ${hy - 20}, ${hx + 18} ${hy + 4} Z`} fill={accent} opacity={0.8} />
        </g>
      );

    case "Fighter":
    case "Paladin":
      return (
        <g>
          <line x1={hx + 2} y1={hy - 20} x2={hx + 6} y2={hy + 40} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={hx - 6} y1={hy + 2} x2={hx + 14} y2={hy - 2} stroke={accent} strokeWidth={3} strokeLinecap="round" />
          {characterClass === "Paladin" && (
            <circle cx={hx + 4} cy={hy - 14} r={4} fill={accent} opacity={0.5} />
          )}
        </g>
      );

    case "Rogue":
      return (
        <g>
          <line x1={hx} y1={hy - 5} x2={hx + 4} y2={hy + 20} stroke={accent} strokeWidth={2} strokeLinecap="round" />
          <line x1={hx + 8} y1={hy - 5} x2={hx + 12} y2={hy + 20} stroke={accent} strokeWidth={2} strokeLinecap="round" />
        </g>
      );

    case "Ranger":
      return (
        <g>
          <path d={`M ${hx + 6} ${hy - 30} Q ${hx + 24} ${hy}, ${hx + 6} ${hy + 30}`}
            fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={hx + 8} y1={hy - 28} x2={hx + 8} y2={hy + 28} stroke={accent} strokeWidth={1} opacity={0.6} />
        </g>
      );

    case "Wizard":
      return (
        <g>
          <line x1={hx + 4} y1={hy - 40} x2={hx + 8} y2={hy + 50} stroke={accent} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          <circle cx={hx + 4} cy={hy - 42} r={8} fill={accent} opacity={0.4} />
          <circle cx={hx + 4} cy={hy - 42} r={4} fill={accent} opacity={0.8} />
        </g>
      );

    case "Sorcerer":
      return (
        <g>
          <circle cx={hx + 6} cy={hy + 6} r={14} fill={accent} opacity={0.15} />
          <circle cx={hx + 6} cy={hy + 6} r={8} fill={accent} opacity={0.3} />
          <circle cx={hx + 6} cy={hy + 6} r={4} fill={accent} opacity={0.7} />
        </g>
      );

    case "Warlock":
      return (
        <g>
          <path d={`M ${hx + 4} ${hy} Q ${hx + 20} ${hy - 15}, ${hx + 10} ${hy - 30}`}
            fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
          <path d={`M ${hx + 6} ${hy + 2} Q ${hx + 24} ${hy + 5}, ${hx + 18} ${hy - 20}`}
            fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
          <circle cx={hx + 6} cy={hy + 4} r={6} fill={accent} opacity={0.5} />
        </g>
      );

    case "Cleric":
      return (
        <g>
          <path d={`M ${hx - 2} ${hy - 12} L ${hx + 16} ${hy - 12} L ${hx + 14} ${hy + 12} L ${hx + 7} ${hy + 20} L ${hx} ${hy + 12} Z`}
            fill={accent} opacity={0.3} stroke={accent} strokeWidth={1.5} />
          <line x1={hx + 7} y1={hy - 6} x2={hx + 7} y2={hy + 10} stroke={accent} strokeWidth={2} />
          <line x1={hx + 1} y1={hy + 2} x2={hx + 13} y2={hy + 2} stroke={accent} strokeWidth={2} />
        </g>
      );

    case "Druid":
      return (
        <g>
          <line x1={hx + 4} y1={hy - 35} x2={hx + 8} y2={hy + 50} stroke={accent} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          <ellipse cx={hx + 1} cy={hy - 32} rx={6} ry={10} fill={accent} opacity={0.5} transform={`rotate(-30 ${hx + 1} ${hy - 32})`} />
          <ellipse cx={hx + 10} cy={hy - 28} rx={5} ry={8} fill={accent} opacity={0.4} transform={`rotate(20 ${hx + 10} ${hy - 28})`} />
        </g>
      );

    case "Bard":
      return (
        <g>
          <ellipse cx={hx + 8} cy={hy + 8} rx={10} ry={14} fill={accent} opacity={0.3} />
          <ellipse cx={hx + 8} cy={hy + 8} rx={7} ry={10} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.6} />
          <line x1={hx + 8} y1={hy - 6} x2={hx + 8} y2={hy - 28} stroke={accent} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        </g>
      );

    case "Monk":
      return (
        <g>
          <circle cx={48} cy={hy + 6} r={8} fill={accent} opacity={0.25} />
          <circle cx={hx + 6} cy={hy + 6} r={8} fill={accent} opacity={0.25} />
          <circle cx={48} cy={hy + 6} r={4} fill={accent} opacity={0.5} />
          <circle cx={hx + 6} cy={hy + 6} r={4} fill={accent} opacity={0.5} />
        </g>
      );

    default:
      return null;
  }
}

const DEFAULT_AVATAR: AvatarCustomization = {
  hairStyle: "short",
  hairColor: "#5c3a1e",
  skinTone: "#f5d0a9",
  bodyBuild: "average",
  height: "average",
};

export function AvatarSilhouette({ race, characterClass, gender, avatar }: Props) {
  const a = avatar ?? DEFAULT_AVATAR;
  const body = RACE_BODY[race];
  const accent = CLASS_ACCENT[characterClass];
  const cfg = getBodyConfig(body, gender, a.bodyBuild, a.height);
  const buildArmW = BUILD_SCALE[a.bodyBuild].armW;

  return (
    <svg
      viewBox="0 0 200 320"
      className="w-full h-full"
      aria-label={`${gender} ${race} ${characterClass} silhouette`}
    >
      {/* Subtle glow behind the figure */}
      <defs>
        <radialGradient id="avatar-glow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.12} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={100} cy={150} rx={80} ry={130} fill="url(#avatar-glow)" />

      {/* Ground shadow */}
      <ellipse cx={100} cy={305} rx={50} ry={8} className="fill-current opacity-10" />

      {/* Body with skin tone */}
      <BaseTorso cfg={cfg} gender={gender} skinTone={a.skinTone} buildArmW={buildArmW} />

      {/* Racial features */}
      <RacialFeatures
        race={race}
        headY={cfg.headY}
        headR={cfg.headR}
        skinTone={a.skinTone}
        hairColor={a.hairColor}
        hipY={cfg.headY + cfg.headR + 4 + 8 + cfg.torsoH}
      />

      {/* Hair */}
      <HairLayer
        hairStyle={a.hairStyle}
        hairColor={a.hairColor}
        headY={cfg.headY}
        headR={cfg.headR}
      />

      {/* Eyes — simple dots */}
      <circle cx={90} cy={cfg.headY + 2} r={2.5} fill="#1a1a2e" />
      <circle cx={110} cy={cfg.headY + 2} r={2.5} fill="#1a1a2e" />

      {/* Class weapon / accessory */}
      <ClassAccessory characterClass={characterClass} accent={accent} />
    </svg>
  );
}
