import { NextResponse } from "next/server";
import { errorJson } from "@/lib/demo";
import { getPullMergeState, GitHubError } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  const match = raw.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) {
    return NextResponse.json(
      { error: "Paste a GitHub pull request URL.", code: "bad_request" },
      { status: 400 },
    );
  }
  try {
    const data = await getPullMergeState(match[1], match[2].replace(/\.git$/i, ""), Number(match[3]));
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof GitHubError) return errorJson(err);
    return errorJson(err);
  }
}
