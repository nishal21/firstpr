import { NextResponse } from "next/server";
import { runChecks, splitDiffIntoFiles } from "@/lib/checks";
import {
  GitHubError,
  getBranchSha,
  getContributing,
  getIssue,
  getPullFiles,
  getPullRequest,
  getRepo,
  parsePrUrl,
  parseRepo,
  type GoodFirstIssue,
  type PullRequestInfo,
} from "@/lib/github";
import { scoreChecks } from "@/lib/score";

export const maxDuration = 60;

type ReviewBody = {
  prUrl?: string;
  diff?: string;
  repo?: string;
  issueNumber?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewBody;
    const prUrl = body.prUrl?.trim();
    const diff = body.diff?.trim();

    if (prUrl) {
      return NextResponse.json(await reviewFromPrUrl(prUrl));
    }

    if (diff) {
      return NextResponse.json(
        await reviewFromDiff({
          diff,
          repo: body.repo?.trim(),
          issueNumber: body.issueNumber,
        }),
      );
    }

    return NextResponse.json(
      {
        error: "Provide prUrl, or diff (with optional repo and issueNumber)",
        code: "bad_request",
      },
      { status: 400 },
    );
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

async function reviewFromPrUrl(prUrl: string) {
  const { owner, repo, number } = parsePrUrl(prUrl);
  const [pr, files] = await Promise.all([
    getPullRequest(owner, repo, number),
    getPullFiles(owner, repo, number),
  ]);

  let contributing: string | null = null;
  try {
    const baseSha = await getBranchSha(owner, repo, pr.baseRef);
    contributing = await getContributing(owner, repo, baseSha);
  } catch {
    contributing = null;
  }

  const linkedIssue = await loadFirstLinkedIssue(owner, repo, pr);

  const checks = runChecks({
    pr,
    files,
    contributing,
    linkedIssue,
    pastedDiff: false,
  });
  const { score, verdict } = scoreChecks(checks);

  return {
    mode: "pr" as const,
    owner,
    repo,
    number,
    pr: {
      title: pr.title,
      htmlUrl: pr.htmlUrl,
      headRef: pr.headRef,
      baseRef: pr.baseRef,
      linkedIssueNumbers: pr.linkedIssueNumbers,
    },
    linkedIssue: linkedIssue
      ? {
          number: linkedIssue.number,
          title: linkedIssue.title,
          state: linkedIssue.state,
          labels: linkedIssue.labels,
        }
      : null,
    checks,
    score,
    verdict,
  };
}

async function reviewFromDiff(opts: {
  diff: string;
  repo?: string;
  issueNumber?: number;
}) {
  const files = splitDiffIntoFiles(opts.diff);
  if (files.length === 0) {
    throw new GitHubError(
      "Could not parse any files from the pasted diff",
      "github_error",
    );
  }

  let owner = "";
  let repoName = "";
  let contributing: string | null = null;
  let linkedIssue: GoodFirstIssue | null = null;
  let pr: PullRequestInfo | null = null;

  if (opts.repo) {
    const parsed = parseRepo(opts.repo);
    owner = parsed.owner;
    repoName = parsed.repo;
    try {
      const repoInfo = await getRepo(owner, repoName);
      contributing = await getContributing(owner, repoName, repoInfo.headSha);
    } catch {
      contributing = null;
    }
    if (opts.issueNumber && opts.issueNumber > 0) {
      try {
        linkedIssue = await getIssue(owner, repoName, opts.issueNumber);
      } catch {
        linkedIssue = null;
      }
    }
  }

  const checks = runChecks({
    pr,
    files,
    contributing,
    linkedIssue,
    pastedDiff: true,
  });
  const { score, verdict } = scoreChecks(checks);

  return {
    mode: "diff" as const,
    owner: owner || null,
    repo: repoName || null,
    files: files.map((f) => f.filename),
    linkedIssue: linkedIssue
      ? {
          number: linkedIssue.number,
          title: linkedIssue.title,
          state: linkedIssue.state,
          labels: linkedIssue.labels,
        }
      : null,
    checks,
    score,
    verdict,
  };
}

async function loadFirstLinkedIssue(
  owner: string,
  repo: string,
  pr: PullRequestInfo,
): Promise<GoodFirstIssue | null> {
  const n = pr.linkedIssueNumbers[0];
  if (!n) return null;
  try {
    return await getIssue(owner, repo, n);
  } catch {
    return null;
  }
}
