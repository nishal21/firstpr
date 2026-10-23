import { NextResponse } from "next/server";
import { z } from "zod";
import { matchFixtureKey } from "@/lib/cache";
import { errorJson, jsonWithSource, withDemoFixture } from "@/lib/demo";
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
        { status: 400, headers: { "x-firstpr-source": "live" } },
      );
    }

    const { username, repo } = parsed.data;
    const repoKey = repo?.trim() || "default";
    const key = matchFixtureKey(repoKey, username);

    const { data, source } = await withDemoFixture({
      key,
      run: () =>
        matchIssues({
          username,
          repo: repo === undefined ? undefined : repo,
        }),
    });

    return jsonWithSource(data, source);
  } catch (err) {
    if (err instanceof GitHubError) {
      return errorJson(err);
    }
    return errorJson(err);
  }
}
