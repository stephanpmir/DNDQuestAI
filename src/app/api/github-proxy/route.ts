import { NextResponse } from "next/server";

const ALLOWED_PREFIX = "https://raw.githubusercontent.com/stephanpmir/DNDQuestAI";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !url.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      { error: "Invalid or disallowed URL. Must start with " + ALLOWED_PREFIX },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url);
    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fetch failed" },
      { status: 500 },
    );
  }
}
