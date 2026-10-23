import { NextResponse } from "next/server";
import { explainIssueCached } from "@/lib/explain";
import { GitHubError } from "@/lib/github";
import { LlmError } from "@/lib/llm";

export const maxDuration = 60;

type ExplainBody = {
  owner?: string;
  repo?: string;
  number?: number;
  issueNumber?: number;
  lang?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExplainBody;
    const owner = body.owner?.trim();
    const repo = body.repo?.trim();
    const number = Number(body.number ?? body.issueNumber);
    const lang = body.lang?.trim() || null;

    if (!owner || !repo || !Number.isFinite(number) || number < 1) {
      return NextResponse.json(
        {
          error: "Provide owner, repo, and a positive number",
          code: "bad_request",
        },
        { status: 400 },
      );
    }

    const result = await explainIssueCached({ owner, repo, number, lang });

    return NextResponse.json({
      owner: result.owner,
      repo: result.repo,
      sha: result.sha,
      language: result.language,
      issue: {
        number: result.issue.number,
        title: result.issue.title,
        body: result.issue.body,
        htmlUrl: result.issue.htmlUrl,
        labels: result.issue.labels,
      },
      explanation: result.explanation,
      citations: result.citations,
      droppedCitations: result.droppedCitations,
      learn: result.learn,
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
