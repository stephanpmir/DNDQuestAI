/**
 * Netlify Function: proxy-portrait
 *
 * Proxies Pollinations.ai image requests server-side so the browser
 * never contacts gen.pollinations.ai directly.
 *
 * GET /.netlify/functions/proxy-portrait?prompt=<encoded>&seed=42
 */
exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const prompt = params.prompt;

  if (!prompt) {
    console.warn("[proxy-portrait] Request missing prompt parameter");
    return { statusCode: 400, body: "Missing prompt parameter" };
  }

  const seed = params.seed || String(Math.floor(Math.random() * 999999999));
  const width = parseInt(params.width, 10) || 512;
  const height = parseInt(params.height, 10) || 768;
  const key = process.env.NEXT_PUBLIC_POLLINATIONS_TOKEN || "";

  const upstreamUrl =
    `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}` +
    `?model=flux&width=${width}&height=${height}&seed=${seed}&enhance=true&nologo=true` +
    (key ? `&key=${key}` : "");

  console.log("[proxy-portrait] Prompt received:", prompt.substring(0, 120));
  console.log("[proxy-portrait] Seed:", seed);
  console.log("[proxy-portrait] Upstream URL:", upstreamUrl.substring(0, 250));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(upstreamUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    console.log("[proxy-portrait] Response status:", res.status, res.statusText);
    console.log("[proxy-portrait] Content-Type:", contentType);

    if (!res.ok) {
      let errorBody = "";
      try { errorBody = await res.text(); } catch { /* ignore */ }
      console.error("[proxy-portrait] Pollinations HTTP error:", res.status, res.statusText, errorBody.substring(0, 500));
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: `Upstream error ${res.status}: ${res.statusText}`,
      };
    }

    // Verify we got an image back, not HTML/JSON/text
    if (!contentType.startsWith("image/")) {
      let textBody = "";
      try { textBody = await res.text(); } catch { /* ignore */ }
      console.error("[proxy-portrait] Non-image content-type:", contentType, "body:", textBody.substring(0, 1000));
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: `Upstream returned non-image content-type: ${contentType}`,
      };
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    console.log("[proxy-portrait] Image received, buffer size:", buffer.length, "bytes");

    if (buffer.length === 0) {
      console.error("[proxy-portrait] Empty image buffer returned from Pollinations");
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
    console.error("[proxy-portrait] Fetch error:", isAbort ? "Request timed out after 45s" : msg);
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: isAbort ? "Proxy fetch timed out after 45s" : `Proxy fetch failed: ${msg}`,
    };
  }
};
