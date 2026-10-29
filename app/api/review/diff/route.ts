import { NextResponse } from "next/server";
import { errorJson } from "@/lib/demo";
import { getPullDiff, getPullRequest, requirePublicRepo } from "@/lib/github";
import { parseGitHubInput } from "@/lib/parse-github-input";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Turn a pasted PR link (github.com /pull/N, .diff, .patch, or a
 * patch-diff.githubusercontent.com raw link) into its unified diff.
 * Only the owner, repo and number are read from the link; the diff itself
 * always comes from the GitHub API, and only for public repos.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { url?: unknown };
    const url = typeof body.url === "string" ? body.url.slice(0, 500) : "";
    const parsed = parseGitHubInput(url);
    if (parsed.kind !== "pull") {
      return NextResponse.json(
        { error: "That isn't a GitHub pull request or .diff link.", code: "bad_request" },
        { status: 400 },
      );
    }
    const { owner, repo, number } = parsed;
    await requirePublicRepo(owner, repo);
    const [diff, pr] = await Promise.all([
      getPullDiff(owner, repo, number),
      getPullRequest(owner, repo, number).catch(() => null),
    ]);
    const issueNumber = pr?.linkedIssueNumbers[0] ?? null;
    return NextResponse.json({ owner, repo, number, diff, issueNumber });
  } catch (err) {
    return errorJson(err);
  }
}
