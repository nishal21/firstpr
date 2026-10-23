import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  GitHubError,
  getRateLimit,
  getRepo,
  listGoodFirstIssues,
  parseRepo,
} from "@/lib/github";

// Node is the default for route handlers; `runtime` is incompatible with cacheComponents.
export const maxDuration = 60;

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug route is disabled in production", code: "not_found" },
      { status: 404 },
    );
  }

  try {
    const { owner, repo } = parseRepo(env.DEMO_REPO);
    const [repoInfo, issues, rateLimit] = await Promise.all([
      getRepo(owner, repo),
      listGoodFirstIssues(owner, repo),
      getRateLimit(),
    ]);

    return NextResponse.json({
      demoRepo: env.DEMO_REPO,
      repo: repoInfo,
      issues,
      rateLimit,
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      const status =
        err.code === "rate_limited" ? 429 : err.code === "not_found" ? 404 : 502;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unexpected error",
        code: "github_error",
      },
      { status: 500 },
    );
  }
}
