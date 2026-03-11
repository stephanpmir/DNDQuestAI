import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint: tests server-side connectivity to Pollinations.ai.
 * Visit /api/image-proxy-test in the browser to see JSON results.
 */
export async function GET() {
  const url = "https://image.pollinations.ai/prompt/warrior?width=64&height=64&nologo=true";

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });

    const contentType = res.headers.get("content-type") ?? "(none)";
    const contentLength = res.headers.get("content-length") ?? "(none)";

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      return NextResponse.json({
        success: false,
        status: res.status,
        statusText: res.statusText,
        contentType,
        contentLength,
        body: body.slice(0, 500),
        url,
      });
    }

    // Read a few bytes to confirm it's real image data
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" ");

    return NextResponse.json({
      success: true,
      status: res.status,
      contentType,
      contentLength,
      byteLength: buffer.byteLength,
      firstBytes: hex,
      url,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      status: 0,
      error: msg,
      url,
    });
  }
}
