import { NextResponse } from "next/server";
import { reviewFixtureKey } from "@/lib/cache";
import { splitDiffIntoFiles } from "@/lib/checks";
import { parseContentLang } from "@/lib/content-lang";
import { errorJson, jsonWithSource, withDemoFixture } from "@/lib/demo";
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
  requirePublicRepo,
  type GoodFirstIssue,
  type PullRequestInfo,
} from "@/lib/github";
import { LlmError } from "@/lib/llm";
import { reviewPr } from "@/lib/review";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReviewBody = {
  prUrl?: string;
  diff?: string;
  repo?: string;
  issueNumber?: number;
  lang?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewBody;
    const prUrl = body.prUrl?.trim();
    const diff = body.diff?.trim();
    const lang = parseContentLang(body.lang);

    if (prUrl) {
      const { number } = parsePrUrl(prUrl);
      const key = reviewFixtureKey(number, lang);
      const { data, source } = await withDemoFixture({
        key,
        run: () => reviewFromPrUrl(prUrl, lang),
      });
      return jsonWithSource(data, source);
    }

    if (diff) {
      // Pasted diffs aren't part of the committed demo path; still live-only.
      const data = await reviewFromDiff({
        diff,
        repo: body.repo?.trim(),
        issueNumber: body.issueNumber,
        lang,
      });
      return jsonWithSource(data, "live");
    }

    return NextResponse.json(
      {
        error: "Provide prUrl, or diff (with optional repo and issueNumber)",
        code: "bad_request",
      },
      { status: 400, headers: { "x-firstpr-source": "live" } },
    );
  } catch (err) {
    if (err instanceof GitHubError || err instanceof LlmError) {
      return errorJson(err);
    }
    return errorJson(err);
  }
}

async function reviewFromPrUrl(prUrl: string, lang: string | null) {
  const { owner, repo, number } = parsePrUrl(prUrl);
  await requirePublicRepo(owner, repo);
  const [pr, files] = await Promise.all([
    getPullRequest(owner, repo, number),
    getPullFiles(owner, repo, number),
  ]);

  let contributing: string | null = null;
  let treeSha: string | undefined;
  try {
    const baseSha = await getBranchSha(owner, repo, pr.baseRef);
    treeSha = baseSha;
    contributing = await getContributing(owner, repo, baseSha);
  } catch {
    contributing = null;
    treeSha = pr.headSha;
  }

  const linkedIssue = await loadFirstLinkedIssue(owner, repo, pr);

  const result = await reviewPr({
    pr,
    files,
    contributing,
    linkedIssue,
    pastedDiff: false,
    owner,
    repo,
    prNumber: number,
    lang,
    treeSha,
  });

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
    ...result,
  };
}

async function reviewFromDiff(opts: {
  diff: string;
  repo?: string;
  issueNumber?: number;
  lang: string | null;
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
  const pr: PullRequestInfo | null = null;
  let treeSha: string | undefined;

  if (opts.repo) {
    const parsed = parseRepo(opts.repo);
    owner = parsed.owner;
    repoName = parsed.repo;
    await requirePublicRepo(owner, repoName);
    try {
      const repoInfo = await getRepo(owner, repoName);
      treeSha = repoInfo.headSha;
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

  const result = await reviewPr({
    pr,
    files,
    contributing,
    linkedIssue,
    pastedDiff: true,
    owner: owner || undefined,
    repo: repoName || undefined,
    lang: opts.lang,
    treeSha,
  });

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
    ...result,
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
