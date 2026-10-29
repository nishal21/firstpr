import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { unstable_cache } from "next/cache";
import { algoliaIndexedCount } from "@/lib/algolia-search";
import { cached } from "@/lib/cache";
import { retryDelayMs } from "@/lib/github-rate";
import type { AlgoliaIssueRecord } from "@/lib/algolia-record";
import { issueObjectId } from "@/lib/algolia-plan";
import { getEnv } from "@/lib/env";

export type GitHubErrorCode =
  | "rate_limited"
  | "not_found"
  | "user_not_found"
  | "github_error";

export class GitHubError extends Error {
  readonly code: GitHubErrorCode;
  readonly retryAfterMs: number;

  constructor(message: string, code: GitHubErrorCode, retryAfterMs = 0) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
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

let siteOctokit: Octokit | null = null;
let syncOctokit: Octokit | null = null;
let syncAuth = "";
let missingTokenWarned = false;

const INSTALL_SKEW_MS = 5 * 60 * 1000;
const INSTALL_COOLDOWN_MS = 60_000;
const ETAG_LIMIT = 400;

type InstallToken = { token: string; expiresAt: number };
type EtagHit = { etag: string; data: unknown; url: string };
type RequestOptions = {
  method?: string;
  url?: string;
  baseUrl?: string;
  headers?: { [header: string]: string | number | undefined };
  per_page?: unknown;
  page?: unknown;
  [key: string]: unknown;
};
type EtagResponse = {
  data: unknown;
  url: string;
  headers: { etag?: string | number };
};

let installToken: InstallToken | null = null;
let installInflight: Promise<string | undefined> | null = null;
let installCooldownUntil = 0;
const etagStore = new Map<string, EtagHit>();

const ETAG_PATHS = [
  /^\/repos\/[^/]+\/[^/]+$/,
  /^\/repos\/[^/]+\/[^/]+\/issues\/\d+$/,
  /^\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/,
];

function normalizeAppKey(privateKey: string): string {
  return privateKey
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function fillRoute(url: string, options: RequestOptions): string {
  return url.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = options[name];
    return value == null ? `{${name}}` : encodeURIComponent(String(value));
  });
}

function requestPath(options: RequestOptions): string | null {
  if (!options.url) return null;
  const filled = fillRoute(options.url, options);
  if (filled.startsWith("http://") || filled.startsWith("https://")) {
    try {
      return new URL(filled).pathname;
    } catch {
      return null;
    }
  }
  const path = filled.split("?")[0] ?? filled;
  if (path.startsWith("/")) return path;
  if (options.baseUrl) {
    try {
      return new URL(path, options.baseUrl).pathname;
    } catch {
      return null;
    }
  }
  return path.startsWith("/") ? path : null;
}

function etagKey(options: RequestOptions): string | null {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") return null;
  const path = requestPath(options);
  if (!path || !ETAG_PATHS.some((pattern) => pattern.test(path))) return null;
  const pageBits = [options.per_page, options.page].filter((value) => value != null);
  return pageBits.length > 0 ? `${path}?${pageBits.join(":")}` : path;
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const record = headers as Record<string, string | number | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];
  return value == null ? undefined : String(value);
}

function rememberEtag(key: string, hit: EtagHit): void {
  if (etagStore.has(key)) etagStore.delete(key);
  etagStore.set(key, hit);
  if (etagStore.size <= ETAG_LIMIT) return;
  const oldest = etagStore.keys().next().value;
  if (oldest) etagStore.delete(oldest);
}

function isNotModified(err: unknown): err is { status: number; response?: { headers?: unknown; url?: string } } {
  return Boolean(err) && typeof err === "object" && (err as { status?: number }).status === 304;
}

async function withEtag<O extends RequestOptions, R extends EtagResponse>(
  request: (options: O) => R | Promise<R>,
  options: O,
): Promise<R> {
  const key = etagKey(options);
  const hit = key ? etagStore.get(key) : undefined;
  if (hit) {
    options.headers = { ...(options.headers ?? {}), "if-none-match": hit.etag };
  }
  try {
    const response = await request(options);
    const etag = headerValue(response.headers, "etag");
    if (key && etag) {
      rememberEtag(key, { etag, data: response.data, url: response.url });
    }
    return response;
  } catch (err) {
    if (key && hit && isNotModified(err)) {
      const cached = {
        ...(err.response ?? {}),
        data: hit.data,
        status: 200,
        url: err.response?.url ?? hit.url,
        headers: err.response?.headers ?? {},
      };
      return cached as unknown as R;
    }
    throw err;
  }
}

/** Installation token for site reads. Cached until shortly before expiry. */
async function resolveSiteToken(): Promise<string | undefined> {
  const current = getEnv();
  const appId = current.GITHUB_APP_ID;
  const privateKey = current.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) return current.GITHUB_TOKEN;

  if (installToken && installToken.expiresAt - Date.now() > INSTALL_SKEW_MS) {
    return installToken.token;
  }
  if (Date.now() < installCooldownUntil) return current.GITHUB_TOKEN;

  if (!installInflight) {
    installInflight = mintInstallationToken(appId, privateKey)
      .catch((err: unknown) => {
        installCooldownUntil = Date.now() + INSTALL_COOLDOWN_MS;
        const message = err instanceof Error ? err.message : "unknown error";
        console.warn(
          `GitHub App installation token unavailable (${message}); using GITHUB_TOKEN.`,
        );
        return undefined;
      })
      .finally(() => {
        installInflight = null;
      });
  }

  const minted = await installInflight;
  if (!minted) installCooldownUntil = Date.now() + INSTALL_COOLDOWN_MS;
  return minted ?? current.GITHUB_TOKEN;
}

async function mintInstallationToken(
  appId: string,
  privateKey: string,
): Promise<string | undefined> {
  const auth = createAppAuth({
    appId,
    privateKey: normalizeAppKey(privateKey),
  });
  const appAuth = await auth({ type: "app" });
  const appClient = new Octokit({ auth: appAuth.token });
  const { data } = await appClient.rest.apps.listInstallations({ per_page: 100 });
  const installation = data[0];
  if (!installation) return undefined;
  const installed = await auth({
    type: "installation",
    installationId: installation.id,
  });
  const expiresAt = Date.parse(installed.expiresAt);
  if (!Number.isFinite(expiresAt)) return undefined;
  installToken = { token: installed.token, expiresAt };
  installCooldownUntil = 0;
  return installed.token;
}

/** Site traffic: FirstPRbot installation token, else GITHUB_TOKEN. */
function getOctokit(): Octokit {
  if (siteOctokit) return siteOctokit;
  siteOctokit = new Octokit();
  siteOctokit.hook.wrap("request", async (request, options) => {
    const token = await resolveSiteToken();
    if (!token && !missingTokenWarned) {
      console.warn(
        "No GitHub App installation token or GITHUB_TOKEN; GitHub API calls will be unauthenticated (low rate limits).",
      );
      missingTokenWarned = true;
    }
    const headers = { ...options.headers };
    if (token) headers.authorization = `token ${token}`;
    return withEtag(request, { ...options, headers });
  });
  return siteOctokit;
}

function syncToken(): string | undefined {
  const current = getEnv();
  return current.GITHUB_SYNC_TOKEN || current.GITHUB_TOKEN;
}

/** Algolia sync only. Never the site singleton. */
function getSyncOctokit(): Octokit {
  const token = syncToken() ?? "";
  if (syncOctokit && syncAuth === token) return syncOctokit;
  syncAuth = token;
  syncOctokit = token ? new Octokit({ auth: token }) : new Octokit();
  return syncOctokit;
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

  const secondary = /secondary rate limit|abuse detection/i.test(message);
  if (
    status === 429 ||
    secondary ||
    (status === 403 && remaining === "0")
  ) {
    throw new GitHubError(
      secondary ? message : "GitHub API rate limit exceeded",
      "rate_limited",
      retryDelayMs(e.response?.headers),
    );
  }

  throw new GitHubError(message, "github_error");
}

const SEARCH_GAP_MS = 2_000;
let searchTail: Promise<void> = Promise.resolve();
let lastSearchAt = 0;

/** One search at a time, with a gap, so this process does not trip a secondary limit. */
function queuedSearch<T>(fn: () => Promise<T>): Promise<T> {
  const run = searchTail.then(async () => {
    const gap = SEARCH_GAP_MS - (Date.now() - lastSearchAt);
    if (gap > 0) await wait(gap);
    try {
      return await gh(fn);
    } finally {
      lastSearchAt = Date.now();
    }
  });
  searchTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

/** Cached core lookup (site or app token). False when GitHub returns 404. */
export async function githubUserExists(username: string): Promise<boolean> {
  const login = username.trim();
  return cached(`user-exists:${login.toLowerCase()}`, async () => {
    try {
      await gh(async () => {
        await getOctokit().users.getByUsername({ username: login });
      });
      return true;
    } catch (err) {
      if (err instanceof GitHubError && err.code === "not_found") return false;
      throw err;
    }
  });
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

/** Beginner-friendly labels we search (OR). */
export const BEGINNER_LABELS = [
  "good first issue",
  "good-first-issue",
  "beginner",
  "easy",
  "first-timers-only",
  "starter",
] as const;

function mapListIssue(issue: {
  number: number;
  title: string;
  body?: string | null;
  labels: (string | { name?: string | null })[];
  assignees?: ({ login?: string | null } | null)[] | null;
  html_url: string;
  created_at: string;
  comments: number;
  state?: string;
}): GoodFirstIssue {
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    labels: issue.labels
      .map((label) => (typeof label === "string" ? label : (label.name ?? "")))
      .filter(Boolean),
    assignees: (issue.assignees ?? [])
      .map((a) => a?.login)
      .filter((login): login is string => Boolean(login)),
    htmlUrl: issue.html_url,
    createdAt: issue.created_at,
    comments: issue.comments,
    state: issue.state === "closed" ? "closed" : "open",
  };
}

/**
 * Open beginner-labeled issues for a repo (OR across BEGINNER_LABELS).
 * Uses listForRepo (not search) to avoid secondary rate limits.
 */
export async function listGoodFirstIssues(
  owner: string,
  repo: string,
): Promise<GoodFirstIssue[]> {
  return cached(`gfi-v2:${owner}/${repo}`, async () =>
    gh(async () => {
      const client = getOctokit();
      const byNumber = new Map<number, GoodFirstIssue>();

      await Promise.all(
        BEGINNER_LABELS.map(async (label) => {
          try {
            const { data } = await client.issues.listForRepo({
              owner,
              repo,
              state: "open",
              labels: label,
              per_page: 50,
            });
            for (const issue of data) {
              if ("pull_request" in issue && issue.pull_request) continue;
              if (!byNumber.has(issue.number)) {
                byNumber.set(issue.number, mapListIssue(issue));
              }
            }
          } catch {
            // Label may not exist on this repo — ignore.
          }
        }),
      );

      return [...byNumber.values()].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }),
  );
}

/**
 * True if an open PR is linked to this issue (timeline cross-reference).
 * On errors, returns false so Match still works.
 */
export async function issueHasOpenLinkedPr(
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<boolean> {
  return cached(`linked-pr:${owner}/${repo}:${issueNumber}`, async () => {
    try {
      return await gh(async () => {
        const client = getOctokit();
        const { data } = await client.issues.listEventsForTimeline({
          owner,
          repo,
          issue_number: issueNumber,
          per_page: 100,
        });

        for (const event of data) {
          const ev = event as {
            event?: string;
            source?: {
              issue?: {
                state?: string;
                pull_request?: unknown;
                html_url?: string;
              };
            };
          };
          if (ev.event !== "cross-referenced" && ev.event !== "connected") {
            continue;
          }
          const src = ev.source?.issue;
          if (!src) continue;
          const isPr =
            Boolean(src.pull_request) ||
            (typeof src.html_url === "string" &&
              /\/pull\/\d+/.test(src.html_url));
          if (isPr && src.state === "open") return true;
        }
        return false;
      });
    } catch {
      return false;
    }
  });
}

export async function searchGoodFirstIssues(
  languages: string[],
  limit = 10,
): Promise<GoodFirstIssue[]> {
  const lang = languages[0];
  if (!lang) return [];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const since = oneYearAgo.toISOString().slice(0, 10);
  const labelQ = BEGINNER_LABELS.map((l) => `label:"${l}"`).join(" OR ");

  const cleanLang = lang.toLowerCase();
  return cached(`search-gfi-v3:${cleanLang}:${limit}:${since}`, () =>
    durableGoodFirstSearch(cleanLang, limit, since, labelQ),
  );
}

const durableGoodFirstSearch = unstable_cache(
  async (lang: string, limit: number, since: string, labelQ: string) => {
    const { data } = await queuedSearch(() => {
      const client = getOctokit();
      const q = `is:issue is:open no:assignee -linked:pr created:>${since} language:${lang} (${labelQ})`;
      return client.search.issuesAndPullRequests({
        q,
        sort: "updated",
        order: "desc",
        per_page: Math.min(limit, 100),
      });
    });
    return data.items.slice(0, limit).map((issue) => mapListIssue(issue));
  },
  ["github-gfi-search-v3"],
  { revalidate: 600 },
);

export type TextSearchHit = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  labels: string[];
  createdAt: string;
};

const durableOpenCount = unstable_cache(
  async () => {
    const { data } = await queuedSearch(() => {
      const client = getOctokit();
      return client.search.issuesAndPullRequests({
        q: 'is:issue is:open label:"good first issue"',
        per_page: 1,
      });
    });
    return typeof data.total_count === "number" ? data.total_count : null;
  },
  ["github-gfi-total-v3"],
  { revalidate: 60 * 60 },
);

/** Open good-first-issue total for the landing line. Algolia when configured, else a shared GitHub cache. */
export async function countOpenGoodFirstIssues(): Promise<number | null> {
  try {
    const indexed = await algoliaIndexedCount();
    if (indexed != null && indexed > 0) return indexed;
  } catch {
    // Fall through to the cached GitHub total.
  }
  try {
    return await durableOpenCount();
  } catch {
    return null;
  }
}

/** Public good-first-issue search for the landing omnibox. Cached. No client keys. */
export async function searchBeginnerIssuesByText(
  text: string,
  language?: string,
): Promise<TextSearchHit[]> {
  const clean = text.replace(/[:"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (clean.length < 2) return [];
  const lang = language?.replace(/[^\w#+.\s-]/g, "").trim();
  const cacheKey = `text-gfi-v3:${(lang ?? "").toLowerCase()}:${clean.toLowerCase()}`;
  return cached(cacheKey, () => durableTextSearch(clean, lang ?? ""));
}

const durableTextSearch = unstable_cache(
  async (clean: string, lang: string): Promise<TextSearchHit[]> => {
    const { data } = await queuedSearch(() => {
      const client = getOctokit();
      const langQ = lang ? ` language:"${lang}"` : "";
      const q = `is:issue is:open no:assignee -linked:pr label:"good first issue"${langQ} ${clean}`;
      return client.search.issuesAndPullRequests({
        q,
        sort: "updated",
        order: "desc",
        per_page: 5,
      });
    });
    const hits: TextSearchHit[] = [];
    for (const issue of data.items) {
      if ("pull_request" in issue && issue.pull_request) continue;
      const match = issue.html_url.match(
        /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i,
      );
      if (!match) continue;
      const labels = (issue.labels ?? [])
        .map((label) => (typeof label === "string" ? label : (label.name ?? "")))
        .filter(Boolean)
        .slice(0, 3);
      hits.push({
        owner: match[1] ?? "",
        repo: match[2] ?? "",
        number: Number(match[3]),
        title: issue.title,
        labels,
        createdAt: issue.created_at,
      });
    }
    return hits;
  },
  ["github-text-gfi-v3"],
  { revalidate: 600 },
);

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

const OPEN_ISSUE_QUERY =
  'is:issue is:open no:assignee (label:"good first issue" OR label:"help wanted")';
const STALE_ISSUE_QUERY =
  'is:issue (label:"good first issue" OR label:"help wanted") (is:closed OR assignee:*)';
const INDEX_PAGE_SIZE = 100;
const INDEX_OPEN_PAGES = 6;
const INDEX_STALE_PAGES = 2;
const REPO_BATCH = 30;

export type IssueIndexFetch = {
  records: AlgoliaIssueRecord[];
  complete: boolean;
  rateLimited: boolean;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function repoFromApiUrl(repositoryUrl: string): { owner: string; repo: string } | null {
  const match = repositoryUrl.match(/\/repos\/([^/]+)\/([^/]+)$/i);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  if (!owner || !repo || !/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    return null;
  }
  return { owner, repo };
}

type RepoMeta = { stars: number; language: string; isPrivate: boolean };

type RepoNode = {
  stargazerCount?: number;
  isPrivate?: boolean;
  primaryLanguage?: { name?: string | null } | null;
} | null;

async function loadRepoMeta(
  pairs: { owner: string; repo: string }[],
): Promise<Map<string, RepoMeta>> {
  const meta = new Map<string, RepoMeta>();
  const client = getSyncOctokit();
  for (let offset = 0; offset < pairs.length; offset += REPO_BATCH) {
    const slice = pairs.slice(offset, offset + REPO_BATCH);
    const fields = slice
      .map((pair, index) => {
        const owner = JSON.stringify(pair.owner);
        const repo = JSON.stringify(pair.repo);
        return `r${index}: repository(owner: ${owner}, name: ${repo}) { stargazerCount isPrivate primaryLanguage { name } }`;
      })
      .join("\n");
    try {
      const response = await gh(() =>
        client.request("POST /graphql", {
          query: `query { ${fields} }`,
        }),
      );
      const payload = response.data as {
        data?: Record<string, RepoNode | null>;
      } & Record<string, RepoNode | null>;
      const data = payload.data ?? payload;
      slice.forEach((pair, index) => {
        const node = data?.[`r${index}`];
        if (!node) return;
        meta.set(`${pair.owner}/${pair.repo}`, {
          stars: typeof node.stargazerCount === "number" ? node.stargazerCount : 0,
          language: node.primaryLanguage?.name ?? "",
          isPrivate: Boolean(node.isPrivate),
        });
      });
    } catch (err) {
      if (err instanceof GitHubError && err.code === "rate_limited") break;
      rethrowGitHub(err);
    }
    if (offset + REPO_BATCH < pairs.length) await wait(400);
  }
  return meta;
}

async function searchIndexPage(q: string, page: number) {
  let last: GitHubError | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await queuedSearch(() =>
        getSyncOctokit().search.issuesAndPullRequests({
          q,
          sort: "updated",
          order: "desc",
          per_page: INDEX_PAGE_SIZE,
          page,
        }),
      );
    } catch (err) {
      if (!(err instanceof GitHubError) || err.code !== "rate_limited" || attempt === 1) {
        throw err;
      }
      last = err;
      await wait(err.retryAfterMs > 0 ? err.retryAfterMs : 5_000);
    }
  }
  throw last ?? new GitHubError("GitHub API rate limit exceeded", "rate_limited", 5_000);
}

async function searchIssuePages(
  q: string,
  pages: number,
): Promise<{ items: AlgoliaIssueRecord[]; complete: boolean; rateLimited: boolean }> {
  if (!syncToken()) {
    throw new GitHubError(
      "GITHUB_SYNC_TOKEN or GITHUB_TOKEN is required to sync the issue index",
      "github_error",
    );
  }
  const drafts: AlgoliaIssueRecord[] = [];
  let complete = false;
  let rateLimited = false;

  for (let page = 1; page <= pages; page += 1) {
    let data: Awaited<ReturnType<typeof searchIndexPage>>["data"];
    let headers: Awaited<ReturnType<typeof searchIndexPage>>["headers"];
    try {
      const response = await searchIndexPage(q, page);
      data = response.data;
      headers = response.headers;
    } catch (err) {
      if (err instanceof GitHubError && err.code === "rate_limited") {
        rateLimited = true;
        break;
      }
      throw err;
    }
    const remaining = Number(headerRemaining(headers));
    for (const issue of data.items) {
      if ("pull_request" in issue && issue.pull_request) continue;
      const repo = repoFromApiUrl(issue.repository_url);
      if (!repo) continue;
      const assignees = issue.assignees ?? [];
      const assigned = Boolean(issue.assignee) || assignees.length > 0;
      const labels = (issue.labels ?? [])
        .map((label) => (typeof label === "string" ? label : (label.name ?? "")))
        .filter(Boolean)
        .slice(0, 8);
      const created = Date.parse(issue.created_at);
      const updated = Date.parse(issue.updated_at);
      if (Number.isNaN(created) || Number.isNaN(updated)) continue;
      drafts.push({
        objectID: issueObjectId(repo.owner, repo.repo, issue.number),
        title: issue.title,
        repo: `${repo.owner}/${repo.repo}`,
        url: issue.html_url,
        labels,
        language: "",
        stars: 0,
        created_at: Math.floor(created / 1000),
        updated_at: Math.floor(updated / 1000),
        comments: issue.comments,
        assignee: assigned ? "assigned" : "none",
      });
    }
    const shortPage = data.items.length < INDEX_PAGE_SIZE;
    if (shortPage && !data.incomplete_results) {
      complete = true;
      break;
    }
    if (Number.isFinite(remaining) && remaining < 2) break;
  }

  return { items: drafts, complete, rateLimited };
}

/** Open, unassigned good-first-issue and help-wanted issues for the Algolia index. */
export async function listOpenIssuesForIndex(): Promise<IssueIndexFetch> {
  const { items, complete, rateLimited } = await searchIssuePages(OPEN_ISSUE_QUERY, INDEX_OPEN_PAGES);
  const open = items.filter((item) => item.assignee === "none");
  const repos = new Map<string, { owner: string; repo: string }>();
  for (const item of open) {
    const [owner, repo] = item.repo.split("/");
    if (owner && repo) repos.set(item.repo, { owner, repo });
  }
  const meta = await loadRepoMeta([...repos.values()]);
  const records = open.flatMap((item) => {
    const info = meta.get(item.repo);
    if (info?.isPrivate) return [];
    return [{ ...item, stars: info?.stars ?? 0, language: info?.language ?? "" }];
  });
  return { records, complete, rateLimited };
}

/** Object IDs GitHub now reports as closed or assigned, so the index can drop them. */
export async function listStaleIssueObjectIds(): Promise<string[]> {
  try {
    const { items } = await searchIssuePages(STALE_ISSUE_QUERY, INDEX_STALE_PAGES);
    return [...new Set(items.map((item) => item.objectID))];
  } catch (err) {
    if (err instanceof GitHubError && err.code === "rate_limited") return [];
    throw err;
  }
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
