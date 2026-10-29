/**
 * One parser for anything a newcomer pastes into a search or match box:
 * GitHub repo, issue and PR links (including raw, API and patch-diff hosts),
 * profile links, @handles and bare owner/repo.
 *
 * Kept dependency-free and strip-only TypeScript so scripts can run it with
 * plain `node`.
 */

export type GitHubInput =
  | { kind: "empty" }
  | { kind: "pull"; owner: string; repo: string; number: number }
  | { kind: "issue"; owner: string; repo: string; number: number }
  | { kind: "repo"; owner: string; repo: string }
  | { kind: "user"; username: string }
  /** A link we can't use: another site, or a GitHub page with no repo. */
  | { kind: "url"; host: string }
  | { kind: "text"; text: string };

export const GITHUB_USERNAME =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const REPO_NAME = /^[A-Za-z0-9_.-]{1,100}$/;

/** First path segments on github.com that are pages, not users. */
const RESERVED = new Set([
  "about",
  "apps",
  "codespaces",
  "collections",
  "contact",
  "customer-stories",
  "dashboard",
  "enterprise",
  "events",
  "explore",
  "features",
  "issues",
  "login",
  "logout",
  "marketplace",
  "new",
  "notifications",
  "organizations",
  "orgs",
  "pricing",
  "pulls",
  "search",
  "security",
  "settings",
  "signup",
  "site",
  "sponsors",
  "stars",
  "team",
  "topics",
  "trending",
  "users",
]);

function cleanRepo(name: string): string {
  return name.replace(/\.(?:git|diff|patch)$/i, "");
}

function validOwner(owner: string): boolean {
  return GITHUB_USERNAME.test(owner);
}

function validRepo(repo: string): boolean {
  return REPO_NAME.test(repo) && repo !== "." && repo !== "..";
}

function repoOrNull(owner: string, rawRepo: string): GitHubInput | null {
  const repo = cleanRepo(rawRepo);
  if (!validOwner(owner) || !validRepo(repo)) return null;
  return { kind: "repo", owner, repo };
}

function numbered(
  kind: "pull" | "issue",
  owner: string,
  rawRepo: string,
  rawNumber: string,
): GitHubInput | null {
  const base = repoOrNull(owner, rawRepo);
  if (!base || base.kind !== "repo") return null;
  const number = Number(rawNumber.replace(/\.(?:diff|patch)$/i, ""));
  if (!Number.isInteger(number) || number <= 0) return base;
  return { kind, owner: base.owner, repo: base.repo, number };
}

/** owner/repo[/pull/N | /issues/N | anything else] */
function fromRepoPath(parts: string[]): GitHubInput | null {
  const [owner, repo, section, num] = parts;
  if (!owner || !repo) return null;
  if (num && /^(?:pull|pulls)$/i.test(section ?? "")) {
    return numbered("pull", owner, repo, num);
  }
  if (num && /^issues$/i.test(section ?? "")) {
    return numbered("issue", owner, repo, num);
  }
  return repoOrNull(owner, repo);
}

function fromUrl(url: URL): GitHubInput {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  const notUsable: GitHubInput = { kind: "url", host };

  if (host === "github.com") {
    const [first] = parts;
    if (!first) return notUsable;
    if (first.toLowerCase() === "orgs" && parts[1] && validOwner(parts[1])) {
      return { kind: "user", username: parts[1] };
    }
    if (RESERVED.has(first.toLowerCase())) return notUsable;
    if (parts.length === 1) {
      return validOwner(first) ? { kind: "user", username: first } : notUsable;
    }
    return fromRepoPath(parts) ?? notUsable;
  }

  if (host === "patch-diff.githubusercontent.com") {
    // /raw/owner/repo/pull/123.diff
    const rest = parts[0] === "raw" ? parts.slice(1) : parts;
    return fromRepoPath(rest) ?? notUsable;
  }

  if (host === "raw.githubusercontent.com") {
    // /owner/repo/<ref>/<path>
    return (parts.length >= 2 && repoOrNull(parts[0], parts[1])) || notUsable;
  }

  if (host === "api.github.com") {
    if (parts[0] === "repos") return fromRepoPath(parts.slice(1)) ?? notUsable;
    if ((parts[0] === "users" || parts[0] === "orgs") && parts[1] && validOwner(parts[1])) {
      return { kind: "user", username: parts[1] };
    }
    return notUsable;
  }

  return notUsable;
}

/** Looks like a link even without a scheme: www.x, or host.tld/path. */
function looksLikeUrl(text: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return true;
  if (/^www\./i.test(text)) return true;
  if (/^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?\//i.test(text)) return true;
  // A bare domain. Only common web TLDs, so "next.js" stays a word.
  return /^(?:[a-z0-9-]+\.)+(?:com|org|net|gov|edu)$/i.test(text);
}

function toUrl(text: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

/** Parse one pasted or typed value. Never throws. */
export function parseGitHubInput(raw: string): GitHubInput {
  // Trim, and drop wrapping <> or quotes and trailing sentence punctuation.
  const text = raw
    .trim()
    .replace(/^[<"'`(]+/, "")
    .replace(/[>"'`),.;!?]+$/, "")
    .trim();
  if (!text) return { kind: "empty" };

  if (text.startsWith("@")) {
    const name = text.slice(1).trim();
    if (validOwner(name)) return { kind: "user", username: name };
    return { kind: "text", text };
  }

  // git@github.com:owner/repo.git
  const ssh = text.match(/^git@github\.com:([^/\s]+)\/([^/\s]+)$/i);
  if (ssh) {
    return repoOrNull(ssh[1], ssh[2]) ?? { kind: "url", host: "github.com" };
  }

  if (!/\s/.test(text) && looksLikeUrl(text)) {
    const url = toUrl(text);
    if (url && /^https?:$/.test(url.protocol)) return fromUrl(url);
    return { kind: "url", host: url?.hostname ?? "" };
  }

  const slash = text.match(/^([^/\s]+)\/([^/\s]+)\/?$/);
  if (slash) {
    const repo = repoOrNull(slash[1], slash[2]);
    if (repo) return repo;
  }

  return { kind: "text", text };
}

/** "owner/repo" for any input that names a repo, else null. */
export function repoSlug(input: GitHubInput): string | null {
  if (input.kind === "repo" || input.kind === "pull" || input.kind === "issue") {
    return `${input.owner}/${input.repo}`;
  }
  return null;
}

/** Normalize a value typed in a repo box: links become owner/repo, other text is kept. */
export function normalizeRepoField(raw: string): string {
  const parsed = parseGitHubInput(raw);
  return repoSlug(parsed) ?? raw.trim();
}

/** Normalize a value typed in a username box: @x and profile links become x. */
export function normalizeUsernameField(raw: string): string {
  const parsed = parseGitHubInput(raw);
  if (parsed.kind === "user") return parsed.username;
  return raw.trim().replace(/^@/, "");
}

/** Shorten long text for headings, keeping the start and the end. */
export function shortLabel(text: string, max = 60): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${clean.slice(0, head)}…${clean.slice(clean.length - tail)}`;
}
