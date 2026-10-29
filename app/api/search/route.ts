import { NextResponse } from "next/server";
import { algoliaSearchEnabled, searchAlgoliaIssues } from "@/lib/algolia-search";
import {
  GitHubError,
  isPublicRepo,
  listGoodFirstIssues,
  searchBeginnerIssuesByText,
} from "@/lib/github";
import { parseOmniQuery } from "@/lib/omnisearch";
import { parseGitHubInput } from "@/lib/parse-github-input";

export const runtime = "nodejs";

const REPO_LIMIT = 8;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const langParam = url.searchParams.get("lang") ?? "";
  const input = parseGitHubInput(q);

  // A pasted link is never a word search.
  if (input.kind === "url" || input.kind === "user") {
    return NextResponse.json({
      issues: [],
      error: input.kind === "url" ? "not_github" : undefined,
    });
  }

  if (input.kind === "repo" || input.kind === "pull" || input.kind === "issue") {
    const { owner, repo } = input;
    try {
      // Only public repos: the site token may see private ones.
      if (!(await isPublicRepo(owner, repo))) {
        return NextResponse.json({ issues: [], error: "repo_not_found", repo: `${owner}/${repo}` });
      }
      const list = await listGoodFirstIssues(owner, repo);
      const issues = list.slice(0, REPO_LIMIT).map((issue) => ({
        owner,
        repo,
        number: issue.number,
        title: issue.title,
        labels: issue.labels,
        createdAt: issue.createdAt,
      }));
      return NextResponse.json({ issues, repo: `${owner}/${repo}` });
    } catch (err) {
      if (err instanceof GitHubError && err.code === "rate_limited") {
        return NextResponse.json({ issues: [], error: "rate_limited" });
      }
      if (err instanceof GitHubError && err.code === "not_found") {
        return NextResponse.json({ issues: [], error: "repo_not_found" });
      }
      return NextResponse.json({ issues: [], error: "generic" });
    }
  }
  const parsed = parseOmniQuery(q);
  const topic = parsed.find((item) => item.flow === "match-topic");
  const language =
    (topic && topic.flow === "match-topic" ? topic.language : undefined) ||
    langParam.trim() ||
    undefined;

  if (algoliaSearchEnabled()) {
    try {
      const issues = await searchAlgoliaIssues(q, language);
      return NextResponse.json({ issues });
    } catch {
      // The index was unreachable. Fall through to the cached GitHub search.
    }
  }

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
