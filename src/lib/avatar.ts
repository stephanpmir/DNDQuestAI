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

export interface AvatarPromptInput {
  race: Race;
  class: CharacterClass;
  gender: Gender;
  avatar: AvatarCustomization;
}

/** Build a D&D portrait prompt from character attributes */
export function buildAvatarPrompt(data: AvatarPromptInput): string {
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
export function nameToSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Build a Pollinations.ai image URL for live preview (client-side, no auth needed) */
export function buildAvatarPreviewUrl(
  data: AvatarPromptInput,
  name: string,
  size: number = 512
): string {
  const prompt = buildAvatarPrompt(data);
  const seed = nameToSeed(name || "adventurer");
  const url = new URL(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
  );
  url.searchParams.set("width", String(size));
  url.searchParams.set("height", String(size));
  url.searchParams.set("seed", String(seed));
  url.searchParams.set("nologo", "true");
  url.searchParams.set("enhance", "true");
  return url.toString();
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
      }),
    });

    if (!response.ok) {
      console.warn("[Avatar] Generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data.avatarUrl ?? null;
  } catch (error) {
    console.warn("[Avatar] Generation error:", error instanceof Error ? error.message : error);
    return null;
  }
}
