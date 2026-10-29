import { NextResponse } from "next/server";
import { GitHubError, searchBeginnerIssuesByText } from "@/lib/github";
import { parseOmniQuery } from "@/lib/omnisearch";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const langParam = url.searchParams.get("lang") ?? "";
  const parsed = parseOmniQuery(q);
  const topic = parsed.find((item) => item.flow === "match-topic");
  const language =
    (topic && topic.flow === "match-topic" ? topic.language : undefined) ||
    langParam.trim() ||
    undefined;

  try {
    const issues = await searchBeginnerIssuesByText(q, language);
    return NextResponse.json({ issues });
  } catch (err) {
    if (err instanceof GitHubError && err.code === "rate_limited") {
      return NextResponse.json(
        { issues: [], error: "rate_limited" },
        { status: 200 },
      );
    }
    return NextResponse.json({ issues: [] });
  }
}
