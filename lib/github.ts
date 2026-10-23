import { Octokit } from "@octokit/rest";
import { cached } from "@/lib/cache";
import { env } from "@/lib/env";

export type GitHubErrorCode = "rate_limited" | "not_found" | "github_error";

export class GitHubError extends Error {
  readonly code: GitHubErrorCode;

  constructor(message: string, code: GitHubErrorCode) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
  }
}

export type RepoInfo = {
  defaultBranch: string;
  headSha: string;
  language: string | null;
  description: string | null;
  stars: number;
};

export type GoodFirstIssue = {
  number: number;
  title: string;
  body: string | null;
  labels: string[];
  assignees: string[];
  htmlUrl: string;
  createdAt: string;
  comments: number;
  state: "open" | "closed";
};

export type PullRequestInfo = {
  title: string;
  body: string | null;
  headRef: string;
  baseRef: string;
  user: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  htmlUrl: string;
  headSha: string;
  linkedIssueNumbers: number[];
};

export type PullFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
};

export type RateLimitInfo = {
  core: number;
  search: number;
};

const SKIP_DIR_NAMES = new Set(["node_modules", "dist", "target", "pkg", ".git"]);
const MAX_TREE_FILE_BYTES = 200 * 1024;
const MAX_FILE_BYTES = 300 * 1024;
const MAX_PATCH_CHARS = 8000;

const CLOSE_KEYWORD_RE =
  /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;

let octokit: Octokit | null = null;
let missingTokenWarned = false;

function getOctokit(): Octokit {
  if (octokit) return octokit;

  const token = env.GITHUB_TOKEN;
  if (!token) {
    if (!missingTokenWarned) {
      console.warn(
        "GITHUB_TOKEN is missing; GitHub API calls will be unauthenticated (low rate limits).",
      );
      missingTokenWarned = true;
    }
    octokit = new Octokit();
  } else {
    octokit = new Octokit({ auth: token });
  }

  return octokit;
}

function headerRemaining(
  headers: Record<string, string | number | undefined> | undefined,
): string | undefined {
  if (!headers) return undefined;
  const value = headers["x-ratelimit-remaining"] ?? headers["X-RateLimit-Remaining"];
  return value === undefined ? undefined : String(value);
}

function rethrowGitHub(err: unknown): never {
  if (err instanceof GitHubError) throw err;

  const e = err as {
    status?: number;
    message?: string;
    response?: {
      status?: number;
      headers?: Record<string, string | number | undefined>;
    };
  };

  const status = e.status ?? e.response?.status;
  const remaining = headerRemaining(e.response?.headers);
  const message = e.message ?? "GitHub request failed";

  if (status === 404) {
    throw new GitHubError(message, "not_found");
  }

  if (
    status === 429 ||
    (status === 403 && remaining === "0") ||
    ((status === 403 || status === 429) && remaining === "0")
  ) {
    throw new GitHubError("GitHub API rate limit exceeded", "rate_limited");
  }

  throw new GitHubError(message, "github_error");
}

async function gh<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    rethrowGitHub(err);
  }
}

function shouldSkipTreePath(path: string): boolean {
  return path.split("/").some((part) => SKIP_DIR_NAMES.has(part));
}

function parseLinkedIssueNumbers(body: string | null | undefined): number[] {
  if (!body) return [];
  const numbers = new Set<number>();
  for (const match of body.matchAll(CLOSE_KEYWORD_RE)) {
    numbers.add(Number(match[1]));
  }
  return [...numbers].sort((a, b) => a - b);
}

const REPO_NOT_FOUND_MSG = "Couldn't find that repo. Try owner/repo.";

function cleanRepoName(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
}

/**
 * Parse owner/repo from "owner/repo", a GitHub URL (with optional .git / trailing
 * slash), or a bare repo name when `defaultOwner` is set.
 * Never throws "Invalid repo identifier" — uses a friendly message instead.
 */
export function parseRepo(
  input: string,
  opts?: { defaultOwner?: string },
): { owner: string; repo: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
  }

  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com[/:]([^/]+)\/([^/#?\s]+)/i,
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: cleanRepoName(urlMatch[2]),
    };
  }

  const slash = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slash) {
    return {
      owner: slash[1],
      repo: cleanRepoName(slash[2]),
    };
  }

  // Bare repo name: "NekoDroid" → defaultOwner/NekoDroid
  const bare = cleanRepoName(trimmed);
  if (opts?.defaultOwner && /^[\w.-]+$/.test(bare) && !bare.includes("/")) {
    return { owner: opts.defaultOwner, repo: bare };
  }

  throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
}

export { REPO_NOT_FOUND_MSG };

export function parsePrUrl(url: string): {
  owner: string;
  repo: string;
  number: number;
} {
  const match = url.trim().match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i,
  );
  if (!match) {
    throw new GitHubError(`Invalid pull request URL: ${url}`, "github_error");
  }
  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  };
}

export async function getRepo(owner: string, repo: string): Promise<RepoInfo> {
  return cached(`repo:${owner}/${repo}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.repos.get({ owner, repo });
      const { data: ref } = await client.git.getRef({
        owner,
        repo,
        ref: `heads/${data.default_branch}`,
      });

      return {
        defaultBranch: data.default_branch,
        headSha: ref.object.sha,
        language: data.language,
        description: data.description,
        stars: data.stargazers_count,
      };
    }),
  );
}

export async function getUserLanguages(username: string): Promise<string[]> {
  return cached(`user-langs:${username}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.repos.listForUser({
        username,
        per_page: 100,
        sort: "pushed",
      });

      const counts = new Map<string, number>();
      for (const repo of data) {
        if (repo.fork || !repo.language) continue;
        counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
      }

      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang]) => lang);
    }),
  );
}

export async function getIssue(
  owner: string,
  repo: string,
  number: number,
): Promise<GoodFirstIssue> {
  return cached(`issue:${owner}/${repo}:${number}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.issues.get({
        owner,
        repo,
        issue_number: number,
      });

      if ("pull_request" in data && data.pull_request) {
        throw new GitHubError(
          `Issue #${number} is a pull request, not an issue`,
          "github_error",
        );
      }

      return {
        number: data.number,
        title: data.title,
        body: data.body ?? null,
        labels: data.labels
          .map((label) => (typeof label === "string" ? label : (label.name ?? "")))
          .filter(Boolean),
        assignees: (data.assignees ?? []).map((a) => a.login).filter(Boolean),
        htmlUrl: data.html_url,
        createdAt: data.created_at,
        comments: data.comments,
        state: data.state === "closed" ? "closed" : "open",
      };
    }),
  );
}

export async function listGoodFirstIssues(
  owner: string,
  repo: string,
): Promise<GoodFirstIssue[]> {
  return cached(`gfi:${owner}/${repo}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.issues.listForRepo({
        owner,
        repo,
        state: "open",
        labels: "good first issue",
        per_page: 100,
      });

      return data
        .filter((issue) => !("pull_request" in issue && issue.pull_request))
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          body: issue.body ?? null,
          labels: issue.labels.map((label) =>
            typeof label === "string" ? label : (label.name ?? ""),
          ).filter(Boolean),
          assignees: (issue.assignees ?? [])
            .map((a) => a.login)
            .filter(Boolean),
          htmlUrl: issue.html_url,
          createdAt: issue.created_at,
          comments: issue.comments,
          state: "open" as const,
        }));
    }),
  );
}

export async function searchGoodFirstIssues(
  languages: string[],
  limit = 10,
): Promise<GoodFirstIssue[]> {
  const lang = languages[0];
  if (!lang) return [];

  return cached(`search-gfi:${lang}:${limit}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const q = `is:issue is:open label:"good first issue" no:assignee language:${lang}`;
      const { data } = await client.search.issuesAndPullRequests({
        q,
        sort: "updated",
        order: "desc",
        per_page: Math.min(limit, 100),
      });

      return data.items.slice(0, limit).map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? null,
        labels: issue.labels.map((label) =>
          typeof label === "string" ? label : (label.name ?? ""),
        ).filter(Boolean),
        assignees: (issue.assignees ?? [])
          .map((a) => a?.login)
          .filter((login): login is string => Boolean(login)),
        htmlUrl: issue.html_url,
        createdAt: issue.created_at,
        comments: issue.comments,
        state: issue.state === "closed" ? ("closed" as const) : ("open" as const),
      }));
    }),
  );
}

/** Resolve a branch name to its tip commit SHA. */
export async function getBranchSha(
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  return cached(`branch-sha:${owner}/${repo}:${branch}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return data.object.sha;
    }),
  );
}

export async function getTree(
  owner: string,
  repo: string,
  sha: string,
): Promise<string[]> {
  return cached(`tree:${owner}/${repo}:${sha}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.git.getTree({
        owner,
        repo,
        tree_sha: sha,
        recursive: "true",
      });

      return (data.tree ?? [])
        .filter((entry) => {
          if (entry.type !== "blob" || !entry.path) return false;
          if (shouldSkipTreePath(entry.path)) return false;
          if (typeof entry.size === "number" && entry.size > MAX_TREE_FILE_BYTES) {
            return false;
          }
          return true;
        })
        .map((entry) => entry.path as string);
    }),
  );
}

export async function getFile(
  owner: string,
  repo: string,
  sha: string,
  path: string,
): Promise<string> {
  return cached(`file:${owner}/${repo}:${sha}:${path}`, async () => {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new GitHubError(
        err instanceof Error ? err.message : "Failed to fetch file",
        "github_error",
      );
    }

    if (res.status === 404) {
      throw new GitHubError(`File not found: ${path}`, "not_found");
    }
    if (!res.ok) {
      throw new GitHubError(
        `Failed to fetch ${path} (${res.status})`,
        "github_error",
      );
    }

    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength > MAX_FILE_BYTES ? buf.slice(0, MAX_FILE_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  });
}

export async function getContributing(
  owner: string,
  repo: string,
  sha: string,
): Promise<string | null> {
  return cached(`contributing:${owner}/${repo}:${sha}`, async () => {
    const candidates = [
      "CONTRIBUTING.md",
      ".github/CONTRIBUTING.md",
      "docs/CONTRIBUTING.md",
    ];

    for (const path of candidates) {
      try {
        return await getFile(owner, repo, sha, path);
      } catch (err) {
        if (err instanceof GitHubError && err.code === "not_found") continue;
        throw err;
      }
    }

    return null;
  });
}

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestInfo> {
  return cached(`pr:${owner}/${repo}:${number}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.pulls.get({ owner, repo, pull_number: number });

      return {
        title: data.title,
        body: data.body ?? null,
        headRef: data.head.ref,
        baseRef: data.base.ref,
        user: data.user?.login ?? null,
        additions: data.additions,
        deletions: data.deletions,
        changedFiles: data.changed_files,
        htmlUrl: data.html_url,
        headSha: data.head.sha,
        linkedIssueNumbers: parseLinkedIssueNumbers(data.body),
      };
    }),
  );
}

export async function getPullFiles(
  owner: string,
  repo: string,
  number: number,
): Promise<PullFile[]> {
  return cached(`pr-files:${owner}/${repo}:${number}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const { data } = await client.pulls.listFiles({
        owner,
        repo,
        pull_number: number,
        per_page: 100,
      });

      return data.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
          ? file.patch.length > MAX_PATCH_CHARS
            ? file.patch.slice(0, MAX_PATCH_CHARS)
            : file.patch
          : null,
      }));
    }),
  );
}

export async function getRateLimit(): Promise<RateLimitInfo> {
  return cached(
    "rate-limit",
    async () =>
      gh(async () => {
        const client = getOctokit();
        const { data } = await client.rateLimit.get();
        return {
          core: data.resources.core.remaining,
          search: data.resources.search.remaining,
        };
      }),
    30_000,
  );
}
