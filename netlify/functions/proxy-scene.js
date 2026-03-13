/**
 * Netlify Function: proxy-scene
 *
 * Proxies Pollinations.ai scene/landscape image requests server-side.
 * Hardcodes landscape dimensions, environment-only prompts, and a
 * negative prompt to prevent any characters from appearing.
 *
 * GET /.netlify/functions/proxy-scene?prompt=<encoded>&seed=42
 */
exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const prompt = params.prompt;

  if (!prompt) {
    console.warn("[proxy-scene] Request missing prompt parameter");
    return { statusCode: 400, body: "Missing prompt parameter" };
  }

  const seed = params.seed || String(Math.floor(Math.random() * 999999999));
  const key = process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || "";

  const finalPrompt =
    `environment landscape architecture ${prompt} no people no faces no characters wide establishing shot dark fantasy digital art dramatic lighting`;

  const negative =
    "person,people,face,portrait,character,warrior,elf,human,figure,man,woman,hero,adventurer,close-up,headshot";

  const upstreamUrl =
    `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}` +
    `?model=flux&width=800&height=450&seed=${seed}&enhance=true&nologo=true` +
    `&negative=${encodeURIComponent(negative)}` +
    (key ? `&key=${key}` : "");

  console.log("[proxy-scene] Prompt received:", prompt.substring(0, 120));
  console.log("[proxy-scene] Final prompt:", finalPrompt.substring(0, 200));
  console.log("[proxy-scene] Seed:", seed);
  console.log("[proxy-scene] Upstream URL:", upstreamUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(upstreamUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    console.log("[proxy-scene] Response status:", res.status, res.statusText);
    console.log("[proxy-scene] Content-Type:", contentType);

    if (!res.ok) {
      let errorBody = "";
      try { errorBody = await res.text(); } catch { /* ignore */ }
      console.error("[proxy-scene] Pollinations HTTP error:", res.status, res.statusText, errorBody.substring(0, 500));
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: `Upstream error ${res.status}: ${res.statusText}`,
      };
    }

    if (!contentType.startsWith("image/")) {
      let textBody = "";
      try { textBody = await res.text(); } catch { /* ignore */ }
      console.error("[proxy-scene] Non-image content-type:", contentType, "body:", textBody.substring(0, 1000));
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: `Upstream returned non-image content-type: ${contentType}`,
      };
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    console.log("[proxy-scene] Image received, buffer size:", buffer.length, "bytes");

    if (buffer.length === 0) {
      console.error("[proxy-scene] Empty image buffer returned from Pollinations");
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "Upstream returned empty image",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isAbort = error instanceof Error && error.name === "AbortError";
    console.error("[proxy-scene] Fetch error:", isAbort ? "Request timed out after 45s" : msg);
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: isAbort ? "Proxy fetch timed out after 45s" : `Proxy fetch failed: ${msg}`,
    };
  }
};
