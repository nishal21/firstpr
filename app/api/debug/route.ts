import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  GitHubError,
  getIssue,
  getRateLimit,
  getRepo,
  listGoodFirstIssues,
  parseRepo,
} from "@/lib/github";
import { LlmError, ping } from "@/lib/llm";
import { pickFiles } from "@/lib/pickFiles";

export const runtime = "nodejs";
export const maxDuration = 60;

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export async function GET() {
  if (isProduction()) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 },
    );
  }

  try {
    const { owner, repo } = parseRepo(env.DEMO_REPO);
    const [repoInfo, issues, rateLimit, llm] = await Promise.all([
      getRepo(owner, repo),
      listGoodFirstIssues(owner, repo),
      getRateLimit(),
      ping(),
    ]);

    const issue4 = await getIssue(owner, repo, 4);
    const picked = await pickFiles({
      owner,
      repo,
      sha: repoInfo.headSha,
      issue: issue4,
    });

    return NextResponse.json({
      demoRepo: env.DEMO_REPO,
      repo: repoInfo,
      issues,
      rateLimit,
      llm,
      pickFiles: {
        issueNumber: 4,
        title: issue4.title,
        files: picked,
      },
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

    if (err instanceof LlmError) {
      const status = err.code === "timeout" ? 504 : 502;
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
