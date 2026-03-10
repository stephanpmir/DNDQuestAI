import { NextResponse } from "next/server";
import type { Race, CharacterClass, Gender, AvatarCustomization } from "@/types/character";
import { HAIR_COLORS, SKIN_TONES } from "@/types/character";

interface AvatarRequest {
  name: string;
  race: Race;
  class: CharacterClass;
  gender: Gender;
  avatar: AvatarCustomization;
}

/** Map hex skin tone values to descriptive names */
function getSkinToneName(hex: string): string {
  const tone = SKIN_TONES.find((t) => t.value === hex);
  return tone?.name.toLowerCase() ?? "medium";
}

/** Map hex hair color values to descriptive names */
function getHairColorName(hex: string): string {
  const color = HAIR_COLORS.find((c) => c.value === hex);
  return color?.name.toLowerCase() ?? "brown";
}

/** Race-specific visual traits for the prompt */
const RACE_FEATURES: Record<string, string> = {
  Human: "",
  Elf: "pointed ears, slender features, ethereal beauty",
  Dwarf: "stocky build, thick beard, broad shoulders",
  Halfling: "small stature, round face, cheerful expression",
  Gnome: "tiny stature, large curious eyes, pointed nose",
  "Half-Elf": "slightly pointed ears, elegant features",
  "Half-Orc": "prominent lower tusks, greenish skin, muscular jaw",
  Tiefling: "small curved horns, solid-color eyes, tail visible",
  Dragonborn: "draconic head with scales, snout, no hair, reptilian eyes",
};

/** Class-specific visual cues */
const CLASS_FEATURES: Record<string, string> = {
  Barbarian: "wearing fur armor, war paint, fierce expression",
  Bard: "wearing colorful traveling clothes, lute on back",
  Cleric: "wearing vestments with holy symbol, serene expression",
  Druid: "wearing natural leather armor, leaves and vines in hair",
  Fighter: "wearing polished armor, confident stance",
  Monk: "wearing simple robes, calm focused expression",
  Paladin: "wearing plate armor with holy crest, noble bearing",
  Ranger: "wearing forest cloak and leather armor, bow on back",
  Rogue: "wearing dark hooded leather armor, sly expression",
  Sorcerer: "arcane energy swirling around hands, mystical robes",
  Warlock: "dark robes with eldritch symbols, intense gaze",
  Wizard: "wearing arcane robes, spellbook at hip, wise expression",
};

function buildAvatarPrompt(data: AvatarRequest): string {
  const { race, class: cls, gender, avatar } = data;
  const skinTone = getSkinToneName(avatar.skinTone);
  const hairColor = getHairColorName(avatar.hairColor);
  const hairDesc = avatar.hairStyle === "bald" ? "bald" : `${hairColor} ${avatar.hairStyle} hair`;
  const raceFeatures = RACE_FEATURES[race] ?? "";
  const classFeatures = CLASS_FEATURES[cls] ?? "";

  const parts = [
    `Fantasy D&D character portrait`,
    `${gender.toLowerCase()} ${race}`,
    `${cls} class`,
    `${skinTone} skin tone`,
    hairDesc,
    `${avatar.bodyBuild} build`,
    raceFeatures,
    classFeatures,
    `medieval fantasy setting`,
    `dramatic lighting`,
    `detailed face close-up portrait`,
    `painterly digital art style`,
    `RPG character art`,
  ].filter(Boolean);

  return parts.join(", ");
}

/** Generate a deterministic seed from character name */
function nameToSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AvatarRequest;

    if (!body.name || !body.race || !body.class || !body.gender || !body.avatar) {
      return NextResponse.json(
        { error: "Missing required character data" },
        { status: 400 }
      );
    }

    const prompt = buildAvatarPrompt(body);
    const seed = nameToSeed(body.name);
    const apiKey = process.env.POLLINATIONS_API_KEY;

    const imageUrl = new URL(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
    );
    imageUrl.searchParams.set("width", "512");
    imageUrl.searchParams.set("height", "512");
    imageUrl.searchParams.set("seed", String(seed));
    imageUrl.searchParams.set("nologo", "true");
    imageUrl.searchParams.set("enhance", "true");
    imageUrl.searchParams.set("private", "true");

    // Fetch the image server-side (keeps API key private)
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(imageUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error("[Avatar API] Pollinations error:", response.status, response.statusText);
      return NextResponse.json(
        { error: `Image generation failed: ${response.statusText}` },
        { status: 502 }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ avatarUrl: dataUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Avatar API] Error:", msg);
    return NextResponse.json(
      { error: `Avatar generation failed: ${msg}` },
      { status: 500 }
    );
  }
}
