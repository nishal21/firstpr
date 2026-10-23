import { NextResponse } from "next/server";
import { GitHubError } from "@/lib/github";
import { getHint, type HintLevel } from "@/lib/hints";
import { LlmError } from "@/lib/llm";

export const maxDuration = 60;

type HintBody = {
  owner?: string;
  repo?: string;
  number?: number;
  level?: number;
  userMessage?: string | null;
  previousHints?: string[];
  lang?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HintBody;
    const owner = body.owner?.trim();
    const repo = body.repo?.trim();
    const number = Number(body.number);
    const level = Number(body.level) as HintLevel;
    const lang = body.lang?.trim() || null;
    const userMessage = body.userMessage ?? null;
    const previousHints = Array.isArray(body.previousHints)
      ? body.previousHints.map(String)
      : [];

    if (!owner || !repo || !Number.isFinite(number) || number < 1) {
      return NextResponse.json(
        {
          error: "Provide owner, repo, and a positive number",
          code: "bad_request",
        },
        { status: 400 },
      );
    }

    if (level !== 1 && level !== 2 && level !== 3) {
      return NextResponse.json(
        { error: "level must be 1, 2, or 3", code: "bad_request" },
        { status: 400 },
      );
    }

    const result = await getHint({
      owner,
      repo,
      number,
      level,
      userMessage,
      previousHints,
      lang,
    });

    return NextResponse.json({
      askedForCode: result.askedForCode,
      sha: result.sha,
      hint: result.hint,
      points: result.points,
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
