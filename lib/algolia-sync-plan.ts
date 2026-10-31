/** Pure rules for the issue index sync. No SDK calls and no secrets, so scripts can test them. */

/** Labels that make an issue a candidate, compared lowercase. */
export const QUALIFYING_LABELS = ["good first issue", "help wanted"] as const;

/** Start a fresh full pass this often. Between passes the sync only reads what changed. */
export const FULL_PASS_EVERY_S = 30 * 24 * 3600;
/** Re-check every record against GitHub at least this often. */
export const RECHECK_EVERY_S = 7 * 24 * 3600;
/** GitHub's search index can lag a few minutes, so the change cursor never passes now minus this. */
export const SEARCH_LAG_S = 15 * 60;

export function labelsQualify(labels: readonly string[]): boolean {
  return labels.some((label) =>
    (QUALIFYING_LABELS as readonly string[]).includes(label.trim().toLowerCase()),
  );
}

/** What one GraphQL lookup said about an indexed issue. `null` fields mean GitHub returned nothing. */
export type IssueFact = {
  repo: {
    isPrivate: boolean;
    isArchived: boolean;
    stars: number;
    language: string;
  } | null;
  issue: {
    state: string;
    locked: boolean;
    assignees: number;
    labels: string[];
    openLinkedPrs: number;
  } | null;
};

export type DropReason =
  | "repo_gone"
  | "repo_private"
  | "repo_archived"
  | "issue_gone"
  | "closed"
  | "locked"
  | "assigned"
  | "linked_pr"
  | "labels";

export type Verdict = { keep: true } | { keep: false; reason: DropReason };

/** Keep an issue only while it is open, unassigned, unlocked, unclaimed by an open PR and still labelled. */
export function issueVerdict(fact: IssueFact): Verdict {
  if (!fact.repo) return { keep: false, reason: "repo_gone" };
  if (fact.repo.isPrivate) return { keep: false, reason: "repo_private" };
  if (fact.repo.isArchived) return { keep: false, reason: "repo_archived" };
  const issue = fact.issue;
  if (!issue) return { keep: false, reason: "issue_gone" };
  if (issue.state.toUpperCase() !== "OPEN") return { keep: false, reason: "closed" };
  if (issue.locked) return { keep: false, reason: "locked" };
  if (issue.assignees > 0) return { keep: false, reason: "assigned" };
  if (issue.openLinkedPrs > 0) return { keep: false, reason: "linked_pr" };
  if (!labelsQualify(issue.labels)) return { keep: false, reason: "labels" };
  return { keep: true };
}

/** A new full pass is due when none has finished yet or the last one is a month old. */
export function fullPassDue(lastFullPass: number | null, now: number): boolean {
  return lastFullPass === null || now - lastFullPass >= FULL_PASS_EVERY_S;
}

/**
 * Next `updated:>=` cursor after one page sorted by updated time, oldest first.
 * A full page moves to its newest second (or one past it when the whole page shares a second).
 * A short page means we caught up, so park just behind GitHub's index lag to re-read late arrivals.
 */
export function nextUpdatedCursor(
  since: number,
  maxUpdated: number | null,
  fullPage: boolean,
  now: number,
): { since: number; caughtUp: boolean } {
  const ceiling = now - SEARCH_LAG_S;
  if (fullPage && maxUpdated !== null) {
    const next = maxUpdated > since ? maxUpdated : maxUpdated + 1;
    return { since: next, caughtUp: false };
  }
  const reached = maxUpdated ?? since;
  return { since: Math.max(since, Math.min(reached, ceiling)), caughtUp: true };
}

/** Rough Algolia indexing operations per month: one per saved, updated or deleted record. */
export function monthlyOpsEstimate(input: {
  records: number;
  changedPerDay: number;
  removedPerDay: number;
}): { fullPass: number; changes: number; removals: number; rechecks: number; total: number } {
  const fullPass = Math.round(input.records * (30 * 24 * 3600 / FULL_PASS_EVERY_S));
  const changes = input.changedPerDay * 30;
  const removals = input.removedPerDay * 30;
  const rechecks = Math.round(input.records * (30 * 24 * 3600 / RECHECK_EVERY_S));
  return { fullPass, changes, removals, rechecks, total: fullPass + changes + removals + rechecks };
}

const QUALIFY_QUERY = '(label:"good first issue" OR label:"help wanted")';
/** Candidates: open, unassigned, unlocked, no linked PR, in a repo that is not archived. */
export const OPEN_ISSUE_QUERY = `is:issue is:open no:assignee is:unlocked archived:false -linked:pr ${QUALIFY_QUERY}`;
/**
 * Issues that left the candidate set by closing. GitHub's issue search can't OR different
 * qualifiers (an OR group with linked:pr fails with "Unsupported type for the closing
 * reference filter"), so assigned, locked, PR-linked, relabelled and repo changes are caught
 * by checkIndexedIssues instead.
 */
export const STALE_ISSUE_QUERY = `is:issue is:closed ${QUALIFY_QUERY}`;

/** True when a search query puts linked: inside an OR group, which GitHub rejects. */
export function linkedInOrGroup(query: string): boolean {
  for (const group of query.match(/\([^()]*\)/g) ?? []) {
    if (/\bOR\b/.test(group) && /(^|[\s(-])linked:/.test(group)) return true;
  }
  return false;
}

/**
 * True when a full-pass page reached the end of the pass. A short page alone is not enough:
 * GitHub sometimes returns fewer than a full page while thousands of issues are left, and
 * ending the pass there would prune everything it had not reached yet. GitHub's total can
 * run a little ahead of what it returns, so less than a page left over still counts as the end.
 */
export function fullPassPageDone(
  page: { hits: number; total: number; incomplete: boolean },
  pageSize = 100,
): boolean {
  return !page.incomplete && page.hits < pageSize && page.total - page.hits < pageSize;
}

/** Longest a run waits at its start for an earlier rate limit to cool down. */
export const MAX_COOLDOWN_WAIT_MS = 90_000;

/** How long a run should wait before its first GitHub call, given the stored cool-down end (seconds). */
export function cooldownWaitMs(coolUntilS: number, nowMs: number, maxMs = MAX_COOLDOWN_WAIT_MS): number {
  const left = coolUntilS * 1000 - nowMs;
  if (!Number.isFinite(left) || left <= 0) return 0;
  return Math.min(left, maxMs);
}

/**
 * A run stopped by a rate limit. Hand off to a follow-up run when this run still made progress
 * and the wait GitHub asked for fits at the start of the next run. A run that saved nothing ends
 * the chain, so a hard limit never loops.
 */
export function continueAfterLimit(indexed: number, waitMs: number, maxMs = MAX_COOLDOWN_WAIT_MS): boolean {
  return indexed > 0 && waitMs >= 0 && waitMs <= maxMs;
}
