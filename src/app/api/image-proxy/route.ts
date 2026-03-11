import { NextRequest } from "next/server";

/**
 * Proxies Pollinations.ai image requests server-side so the browser
 * never contacts image.pollinations.ai directly (blocked in some envs).
 *
 * GET /api/image-proxy?prompt=<encoded>&width=512&height=512&seed=42&nologo=true&enhance=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const prompt = searchParams.get("prompt");

  if (!prompt) {
    return new Response("Missing prompt parameter", { status: 400 });
  }

  // Build upstream Pollinations URL
  const upstream = new URL(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
  );

  // Forward recognised params
  for (const key of ["width", "height", "seed", "nologo", "enhance", "private"]) {
    const val = searchParams.get(key);
    if (val) upstream.searchParams.set(key, val);
  }

  // Append server-side token
  const token = process.env.POLLINATIONS_API_KEY;
  if (token) upstream.searchParams.set("token", token);

  try {
    const res = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      console.error("[image-proxy] Pollinations error:", res.status, res.statusText);
      return new Response(`Upstream error: ${res.statusText}`, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = res.body;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[image-proxy] Fetch error:", msg);
    return new Response(`Proxy fetch failed: ${msg}`, { status: 502 });
  }
}
