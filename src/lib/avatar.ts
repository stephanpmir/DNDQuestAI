import type { Character } from "@/types/character";

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
