import { NextResponse } from "next/server";
import type { Race, CharacterClass, Gender, AvatarCustomization } from "@/types/character";
import { buildAvatarPrompt, nameToSeed } from "@/lib/avatar";

interface AvatarRequest {
  name: string;
  race: Race;
  class: CharacterClass;
  gender: Gender;
  avatar: AvatarCustomization;
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
