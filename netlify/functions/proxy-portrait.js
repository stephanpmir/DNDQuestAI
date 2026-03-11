/**
 * Netlify Function: proxy-portrait
 *
 * Proxies Pollinations.ai image requests server-side so the browser
 * never contacts image.pollinations.ai directly.
 *
 * GET /.netlify/functions/proxy-portrait?prompt=<encoded>&seed=42&width=512&height=512
 */
exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const prompt = params.prompt;

  if (!prompt) {
    return { statusCode: 400, body: "Missing prompt parameter" };
  }

  const width = params.width || "512";
  const height = params.height || "512";

  const upstream = new URL(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
  );
  upstream.searchParams.set("width", width);
  upstream.searchParams.set("height", height);
  upstream.searchParams.set("nologo", "true");

  if (params.seed) upstream.searchParams.set("seed", params.seed);
  if (params.enhance) upstream.searchParams.set("enhance", params.enhance);

  const token = process.env.POLLINATIONS_API_KEY;
  if (token) upstream.searchParams.set("token", token);

  try {
    const res = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.error("[proxy-portrait] Pollinations error:", res.status, res.statusText);
      return { statusCode: 502, body: `Upstream error: ${res.statusText}` };
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

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
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[proxy-portrait] Fetch error:", msg);
    return { statusCode: 502, body: `Proxy fetch failed: ${msg}` };
  }
};
