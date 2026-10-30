/**
 * F3: after a first-timer's PR is merged, suggest three open good first issues to try next.
 * Pure rules only (picking, formatting, placing the block), so scripts can test them offline.
 */

export const NEXT_ISSUES_START = "<!-- firstprbot:next-issues -->";
export const NEXT_ISSUES_END = "<!-- /firstprbot:next-issues -->";
export const SUGGESTION_COUNT = 3;
/** Candidates kept for the live open/unassigned check, so a few stale ones can be skipped. */
export const CANDIDATE_COUNT = 8;
/** Issues from one other repo, so the list isn't three issues from the same project. */
const MAX_PER_OTHER_REPO = 2;

/** One record as the Algolia issue index returns it. Every field is untrusted. */
export type IndexHit = {
  objectID?: unknown;
  title?: unknown;
  repo?: unknown;
  language?: unknown;
  labels?: unknown;
  assignee?: unknown;
  assigned?: unknown;
};

export type Suggestion = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  language: string;
  sameRepo: boolean;
};

/** The three result lists from the index: this repo, this language, then anything. */
export type SuggestionHits = {
  sameRepo: readonly IndexHit[];
  sameLanguage: readonly IndexHit[];
  any: readonly IndexHit[];
};

function parseId(value: unknown): { owner: string; repo: string; number: number } | null {
  if (typeof value !== "string") return null;
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [owner, repo, raw] = parts;
  const number = Number(raw);
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  if (!Number.isInteger(number) || number < 1) return null;
  return { owner, repo, number };
}

function toSuggestion(hit: IndexHit, repoFullName: string): Suggestion | null {
  const id = parseId(hit.objectID);
  if (!id || typeof hit.title !== "string" || !hit.title.trim()) return null;
  if (hit.assignee === "assigned") return null;
  if (typeof hit.assigned === "number" && hit.assigned > 0) return null;
  return {
    ...id,
    title: hit.title,
    language: typeof hit.language === "string" ? hit.language : "",
    sameRepo: `${id.owner}/${id.repo}`.toLowerCase() === repoFullName.toLowerCase(),
  };
}

/**
 * Candidates in order of preference: this repo first, then the same language, then anything.
 * Skips assigned records, issues the PR just closed, and duplicates.
 */
export function pickSuggestions(
  hits: SuggestionHits,
  ctx: { repo: string; skipNumbers?: readonly number[]; limit?: number },
): Suggestion[] {
  const limit = ctx.limit ?? CANDIDATE_COUNT;
  const skip = new Set(ctx.skipNumbers ?? []);
  const seen = new Set<string>();
  const perRepo = new Map<string, number>();
  const out: Suggestion[] = [];
  const take = (list: readonly IndexHit[], sameRepoOnly: boolean) => {
    for (const hit of list) {
      if (out.length >= limit) return;
      const s = toSuggestion(hit, ctx.repo);
      if (!s) continue;
      if (sameRepoOnly !== s.sameRepo) continue;
      if (s.sameRepo && skip.has(s.number)) continue;
      const key = `${s.owner}/${s.repo}#${s.number}`.toLowerCase();
      if (seen.has(key)) continue;
      const repoKey = `${s.owner}/${s.repo}`.toLowerCase();
      const count = perRepo.get(repoKey) ?? 0;
      if (!s.sameRepo && count >= MAX_PER_OTHER_REPO) continue;
      seen.add(key);
      perRepo.set(repoKey, count + 1);
      out.push(s);
    }
  };
  take(hits.sameRepo, true);
  take(hits.sameLanguage, false);
  take(hits.any, false);
  return out;
}

/** Issue titles come from strangers: one line, no HTML comments, no pings, no link breakouts. */
export function safeTitle(title: string, max = 90): string {
  let t = title
    .replace(/[\r\n\t]+/g, " ")
    .replace(/<!--|-->/g, "")
    .replace(/[<>]/g, "")
    .replace(/[[\]`*_|\\]/g, (c) => `\\${c}`)
    .replace(/@/g, "@\u200b")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > max) t = `${t.slice(0, max - 1).trimEnd()}\u2026`;
  return t;
}

/** The "Next issues" section of the bot comment. Empty when there is nothing to suggest. */
export function formatNextIssuesBlock(suggestions: readonly Suggestion[]): string[] {
  const picked = suggestions.slice(0, SUGGESTION_COUNT);
  if (picked.length === 0) return [];
  const intro =
    picked.length === 1
      ? "Merged. Thanks for the fix. Here is an open beginner issue you could take next:"
      : `Merged. Thanks for the fix. Here are ${picked.length} open beginner issues you could take next:`;
  const lines = [NEXT_ISSUES_START, "#### Next issues to try", "", intro, ""];
  for (const s of picked) {
    const url = `https://github.com/${s.owner}/${s.repo}/issues/${s.number}`;
    const where = s.sameRepo ? "this repo" : s.language ? s.language : "";
    lines.push(`- [${s.owner}/${s.repo}#${s.number}](${url}) ${safeTitle(s.title)}${where ? ` (${where})` : ""}`);
  }
  lines.push(
    "",
    "<sub>From the FirstPR issue index, open and unassigned when this was written. Ask on the issue before you start. Maintainers can turn this off with `suggest_issues: false` in `.github/firstpr.yml`.</sub>",
    NEXT_ISSUES_END,
  );
  return lines;
}

export function hasNextIssuesBlock(body: string): boolean {
  return body.includes(NEXT_ISSUES_START);
}

/** The block from an earlier summary, so a later rewrite of the comment keeps it. */
export function extractNextIssuesBlock(body: string | null | undefined): string[] {
  if (!body) return [];
  const start = body.indexOf(NEXT_ISSUES_START);
  const end = body.indexOf(NEXT_ISSUES_END);
  if (start === -1 || end <= start) return [];
  return body.slice(start, end + NEXT_ISSUES_END.length).split("\n");
}

const MAINTAINER_HEADING = "#### What a maintainer should look at";

/**
 * Put the block into the existing summary: replace an old one, else place it before the
 * maintainer section, else before the footer rule, else at the end.
 */
export function insertNextIssuesBlock(body: string, block: readonly string[]): string {
  if (block.length === 0) return body;
  const text = block.join("\n");
  const start = body.indexOf(NEXT_ISSUES_START);
  const end = body.indexOf(NEXT_ISSUES_END);
  if (start !== -1 && end > start) {
    return body.slice(0, start) + text + body.slice(end + NEXT_ISSUES_END.length);
  }
  const heading = body.indexOf(MAINTAINER_HEADING);
  if (heading !== -1) return `${body.slice(0, heading)}${text}\n\n${body.slice(heading)}`;
  const rule = body.lastIndexOf("\n---\n");
  if (rule !== -1) return `${body.slice(0, rule)}\n\n${text}\n${body.slice(rule)}`;
  return `${body.trimEnd()}\n\n${text}\n`;
}

/** The summary the bot wrote while the PR was open says this was the author's first PR here. */
export function summarySaysFirstTimer(body: string | null | undefined): boolean {
  return Boolean(body && /\|\s*First-time contributor\s*\|\s*Yes\s*\|/.test(body));
}

/** Algolia filter value for a language facet, with quotes escaped. */
export function languageFilter(language: string): string | null {
  const v = language.trim();
  if (!v || v.length > 40 || /[\r\n]/.test(v)) return null;
  return `language:"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}