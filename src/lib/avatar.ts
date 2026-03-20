import type { Character, Race, CharacterClass, Gender, AvatarCustomization } from "@/types/character";
import { HAIR_COLORS, SKIN_TONES } from "@/types/character";

// ── Prompt Building (shared by client preview + server generation) ──

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

/** Class-specific posture, expression, and fighting style — never clothing or equipment */
const CLASS_FEATURES: Record<string, string> = {
  Barbarian: "fierce battle-ready stance, war paint, primal fury in eyes",
  Bard: "charismatic confident posture, playful smirk, performer's flair",
  Cleric: "serene devoted expression, hands clasped in prayer, calm authority",
  Druid: "wild untamed presence, leaves and vines in hair, nature-attuned gaze",
  Fighter: "disciplined military stance, confident bearing, battle-hardened resolve",
  Monk: "centered balanced posture, calm focused expression, coiled readiness",
  Paladin: "noble righteous bearing, resolute jaw, commanding holy presence",
  Ranger: "alert watchful stance, keen tracking eyes, wilderness-hardened demeanor",
  Rogue: "alert and nimble posture, sly expression, street-smart bearing",
  Sorcerer: "arcane energy crackling around hands, intense concentration, raw power",
  Warlock: "brooding intense gaze, eldritch shadows around fingertips, dark resolve",
  Wizard: "scholarly thoughtful expression, wise knowing eyes, arcane focus",
};

export interface AvatarPromptInput {
  race: Race;
  class: CharacterClass;
  gender: Gender;
  avatar: AvatarCustomization;
  /** Currently worn/equipped items — injected as "equipped with: ..." segment */
  wornItems?: string[];
}

/** Build a D&D portrait prompt from character attributes */
export function buildAvatarPrompt(data: AvatarPromptInput): string {
  const { race, class: cls, gender, avatar, wornItems } = data;
  const skinTone = getSkinToneName(avatar.skinTone);
  const hairColor = getHairColorName(avatar.hairColor);
  const hairDesc = avatar.hairStyle === "bald" ? "bald" : `${hairColor} ${avatar.hairStyle} hair`;
  const raceFeatures = RACE_FEATURES[race] ?? "";
  const classFeatures = CLASS_FEATURES[cls] ?? "";
  const equippedSegment = wornItems && wornItems.length > 0
    ? `equipped with: ${wornItems.join(", ")}`
    : "";

  const parts = [
    `fantasy portrait`,
    `${gender.toLowerCase()} ${race.toLowerCase()} ${cls.toLowerCase()}`,
    hairDesc,
    `${skinTone} skin`,
    `${avatar.bodyBuild} build`,
    `${avatar.height} height`,
    raceFeatures,
    classFeatures,
    equippedSegment,
    `D&D character art`,
    `detailed painting`,
    `dark fantasy style`,
    `face visible`,
    `upper body`,
  ].filter(Boolean);

  return parts.join(", ");
}

/** Generate a deterministic seed from character name */
export function nameToSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Build a portrait image URL using gen.pollinations.ai.
 * Server-side: direct Pollinations URL with API key.
 * Client-side: proxied via Netlify function.
 */
export function buildPollinationsUrl(
  prompt: string,
  params: Record<string, string>
): string {
  const seed = params.seed || String(Math.floor(Math.random() * 999999999));
  const width = params.width || "512";
  const height = params.height || "768";

  // Server-side callers (API routes) use the direct Pollinations URL
  if (typeof window === "undefined") {
    const key = process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || "";
    let url =
      `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}` +
      `?model=flux&width=${width}&height=${height}&seed=${seed}&enhance=true&nologo=true`;
    if (key) url += `&key=${key}`;
    return url;
  }

  // Client-side callers use the Netlify proxy
  const searchParams = new URLSearchParams({ prompt, seed });
  return `/.netlify/functions/proxy-portrait?${searchParams.toString()}`;
}

/** Build a Pollinations image URL for live character preview */
export function buildAvatarPreviewUrl(
  data: AvatarPromptInput,
  name: string,
  size: number = 512
): string {
  const prompt = buildAvatarPrompt(data);
  const seed = nameToSeed(name || "adventurer");
  return buildPollinationsUrl(prompt, {
    width: String(size),
    height: String(size),
    seed: String(seed),
    nologo: "true",
    enhance: "true",
  });
}

// ── Server-side generation (called from character wizard) ──

/** Generate an AI avatar for the character via the /api/avatar endpoint.
 *  Returns the base64 data URL, or null on failure. */
export async function generateAvatar(character: Character): Promise<string | null> {
  try {
    const response = await fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: character.name,
        race: character.race,
        class: character.class,
        gender: character.gender,
        avatar: character.avatar,
        equipped: character.equipped,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.avatarUrl ?? null;
  } catch (error) {
    return null;
  }
}
