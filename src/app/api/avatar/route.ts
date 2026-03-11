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
    const token = process.env.POLLINATIONS_API_KEY;

    // Build upstream URL directly (server-side, not through proxy)
    const upstream = new URL(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
    );
    upstream.searchParams.set("width", "512");
    upstream.searchParams.set("height", "512");
    upstream.searchParams.set("seed", String(seed));
    upstream.searchParams.set("nologo", "true");
    upstream.searchParams.set("enhance", "true");
    upstream.searchParams.set("private", "true");
    if (token) upstream.searchParams.set("token", token);

    const response = await fetch(upstream.toString(), {
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
