import { NextResponse } from "next/server";
import { GitHubError, githubUserExists } from "@/lib/github";

export const runtime = "nodejs";

const USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/** Cached existence check for the search menu. Uses the site or app token. */
export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim() ?? "";
  if (!USERNAME.test(username)) {
    return NextResponse.json({ exists: false });
  }
  try {
    const exists = await githubUserExists(username);
    return NextResponse.json(
      { exists },
      { headers: { "cache-control": "private, max-age=600" } },
    );
  } catch (err) {
    if (err instanceof GitHubError && err.code === "rate_limited") {
      return NextResponse.json({ exists: null, error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ exists: null }, { status: 502 });
  }
}
