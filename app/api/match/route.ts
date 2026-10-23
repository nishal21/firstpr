import { NextResponse } from "next/server";
import { z } from "zod";
import { GitHubError } from "@/lib/github";
import { matchIssues } from "@/lib/match";

export const maxDuration = 60;

/** GitHub username: 1–39 chars, alphanumeric or single hyphens, no leading/trailing hyphen. */
const githubUsername = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
    "Invalid GitHub username",
  );

const matchBodySchema = z.object({
  username: githubUsername,
  repo: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = matchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid input",
          code: "bad_request",
        },
        { status: 400 },
      );
    }

    const { username, repo } = parsed.data;
    const result = await matchIssues({
      username,
      repo: repo === undefined ? undefined : repo,
    });

    return NextResponse.json(result);
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
