import {
  runChecks,
  type CheckResult,
  type CheckStatus,
} from "@/lib/checks";
import type { GoodFirstIssue, PullFile, PullRequestInfo } from "@/lib/github";
import { generateJson } from "@/lib/llm";
import { REVIEW_SYSTEM, buildReviewUserPrompt } from "@/lib/prompts/review";
import type {
  ReviewChecklistItem,
  ReviewLineComment,
  ReviewResult,
} from "@/lib/review-format";
import { reviewSchema, type ReviewOutput } from "@/lib/schemas";
import { scoreChecks } from "@/lib/score";

export type {
  ChecklistSource,
  ReviewChecklistItem,
  ReviewLineComment,
  ReviewResult,
} from "@/lib/review-format";
export { formatReviewMarkdown } from "@/lib/review-format";

const CONTRIBUTING_MAX = 6000;
const PATCHES_MAX_TOTAL = 30_000;

export type ReviewPrArgs = {
  pr: PullRequestInfo | null;
  files: PullFile[];
  contributing: string | null;
  linkedIssue: GoodFirstIssue | null;
  pastedDiff?: boolean;
  owner?: string;
  repo?: string;
  prNumber?: number;
  lang?: string | null;
};

/** New-file line numbers covered by any @@ hunk in a unified diff patch. */
export function hunkNewLineRanges(patch: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!m) continue;
    const start = Number(m[1]);
    const count = m[2] !== undefined ? Number(m[2]) : 1;
    if (count === 0) continue;
    ranges.push({ start, end: start + count - 1 });
  }
  return ranges;
}

function lineInHunks(
  line: number,
  ranges: { start: number; end: number }[],
): boolean {
  return ranges.some((r) => line >= r.start && line <= r.end);
}

/** Truncate biggest patches first until total ≤ maxChars. */
export function truncatePatches(
  files: PullFile[],
  maxChars = PATCHES_MAX_TOTAL,
): { path: string; patch: string }[] {
  const entries = files
    .filter((f) => f.patch && f.patch.length > 0)
    .map((f) => ({ path: f.filename, patch: f.patch as string }));

  let total = entries.reduce((s, e) => s + e.patch.length, 0);
  if (total <= maxChars) return entries;

  const bySize = [...entries].sort((a, b) => b.patch.length - a.patch.length);
  for (const e of bySize) {
    if (total <= maxChars) break;
    const excess = total - maxChars;
    const keep = Math.max(0, e.patch.length - excess);
    const removed = e.patch.length - keep;
    e.patch =
      keep > 0
        ? `${e.patch.slice(0, keep)}\n…(truncated)`
        : "…(truncated)";
    total -= removed;
  }
  return entries;
}

function ruleFix(check: CheckResult): string | null {
  if (check.status === "pass") return null;
  switch (check.id) {
    case "linked_issue":
      return "Add a line like “Fixes #N” in the PR description, linking the issue you worked on.";
    case "branch_name":
      return "Rename the branch (or open a new one) using a prefix from CONTRIBUTING.md.";
    case "description":
      return "Expand the PR description: what you changed, why, and how you checked it.";
    case "check_evidence":
      return "Paste the output of the check commands from CONTRIBUTING.md into the PR body.";
    case "tests_touched":
      return "Add or update a test that covers the change, or say in the description why tests are not needed.";
    case "scope":
      return "Split unrelated edits into another PR, or explain why the extra files belong here.";
    case "forbidden_files":
      return "Remove the forbidden paths from the PR and make sure they are not staged.";
    default:
      return check.evidence;
  }
}

function worseStatus(a: CheckStatus, b: CheckStatus): CheckStatus {
  const rank = { fail: 0, warn: 1, pass: 2 } as const;
  return rank[a] <= rank[b] ? a : b;
}

/**
 * Keep AI status unless a related deterministic check failed — then clamp.
 * Model never overrides a deterministic fail.
 */
function mergeAiStatus(
  aiStatus: CheckStatus,
  relatedFails: CheckStatus[],
): CheckStatus {
  let status = aiStatus;
  for (const r of relatedFails) {
    if (r === "fail") status = worseStatus(status, "fail");
  }
  return status;
}

function filterLineComments(
  comments: ReviewOutput["line_comments"],
  files: PullFile[],
  owner?: string,
  repo?: string,
  prNumber?: number,
): ReviewLineComment[] {
  const byPath = new Map(
    files.map((f) => [
      f.filename,
      f.patch ? hunkNewLineRanges(f.patch) : ([] as { start: number; end: number }[]),
    ]),
  );
  const changed = new Set(files.map((f) => f.filename));

  const out: ReviewLineComment[] = [];
  for (const c of comments) {
    if (!changed.has(c.path)) continue;
    const ranges = byPath.get(c.path) ?? [];
    if (ranges.length === 0 || !lineInHunks(c.line, ranges)) continue;
    const filesChangedUrl =
      owner && repo && prNumber
        ? `https://github.com/${owner}/${repo}/pull/${prNumber}/files`
        : null;
    out.push({
      path: c.path,
      line: c.line,
      severity: c.severity,
      comment: c.comment,
      filesChangedUrl,
    });
  }
  return out.slice(0, 6);
}

/**
 * Run deterministic checks, then AI review; merge checklist; score in code.
 */
export async function reviewPr(args: ReviewPrArgs): Promise<ReviewResult> {
  const pastedDiff = Boolean(args.pastedDiff);
  const checks = runChecks({
    pr: args.pr,
    files: args.files,
    contributing: args.contributing,
    linkedIssue: args.linkedIssue,
    pastedDiff,
  });

  const contributing = (args.contributing ?? "").slice(0, CONTRIBUTING_MAX);
  const filesWithPatches = truncatePatches(args.files, PATCHES_MAX_TOTAL);

  const user = buildReviewUserPrompt({
    title: args.pr?.title ?? "(pasted diff)",
    body: args.pr?.body ?? null,
    branch: args.pr?.headRef ?? null,
    linkedIssue: args.linkedIssue
      ? { title: args.linkedIssue.title, body: args.linkedIssue.body }
      : null,
    contributing,
    filesWithPatches,
    checksJson: JSON.stringify(checks, null, 2),
    lang: args.lang,
  });

  const raw = await generateJson({
    task: "review",
    system: REVIEW_SYSTEM,
    user,
    schema: reviewSchema,
    schemaName: "review",
    effort: "medium",
  });

  // Ensure exactly the two AI ids (schema requires length 2; trim if API allowed more).
  const aiItems = raw.checklist
    .filter(
      (c) => c.id === "issue_done_when" || c.id === "contributing_rules",
    )
    .slice(0, 2);

  const linked = checks.find((c) => c.id === "linked_issue");
  const branch = checks.find((c) => c.id === "branch_name");
  const forbidden = checks.find((c) => c.id === "forbidden_files");

  const checklist: ReviewChecklistItem[] = [
    ...checks.map((c) => ({
      id: c.id,
      label: c.label,
      status: c.status,
      evidence: c.evidence,
      fix: ruleFix(c),
      source: "rule" as const,
    })),
  ];

  let issueDoneWhenStatus: CheckStatus = "warn";
  let aiContributingStatus: CheckStatus = "warn";

  for (const item of aiItems) {
    let status = item.status as CheckStatus;
    if (item.id === "issue_done_when") {
      status = mergeAiStatus(status, [linked?.status ?? "warn"]);
      issueDoneWhenStatus = status;
    } else if (item.id === "contributing_rules") {
      status = mergeAiStatus(status, [
        branch?.status ?? "pass",
        forbidden?.status ?? "pass",
      ]);
      aiContributingStatus = status;
    }

    checklist.push({
      id: item.id,
      label: item.label,
      status,
      evidence: item.evidence,
      fix: status === "pass" ? null : item.fix,
      source: "ai",
    });
  }

  // If model omitted an AI row, still score with warn defaults via scoreChecks opts.
  if (!aiItems.some((i) => i.id === "issue_done_when")) {
    checklist.push({
      id: "issue_done_when",
      label: "Issue Done when",
      status: "warn",
      evidence: "AI did not return this checklist item",
      fix: "Re-run the review after the model responds fully.",
      source: "ai",
    });
    issueDoneWhenStatus = "warn";
  }
  if (!aiItems.some((i) => i.id === "contributing_rules")) {
    checklist.push({
      id: "contributing_rules",
      label: "CONTRIBUTING rules",
      status: "warn",
      evidence: "AI did not return this checklist item",
      fix: "Re-run the review after the model responds fully.",
      source: "ai",
    });
    aiContributingStatus = "warn";
  }

  const { score, verdict } = scoreChecks(checks, {
    issueDoneWhenStatus,
    aiContributingStatus,
  });

  const line_comments = filterLineComments(
    raw.line_comments,
    args.files,
    args.owner,
    args.repo,
    args.prNumber,
  );

  return {
    summary: raw.summary,
    checklist,
    line_comments,
    questions_a_maintainer_would_ask: raw.questions_a_maintainer_would_ask.slice(
      0,
      3,
    ),
    encouragement: raw.encouragement,
    score,
    verdict,
    checks,
  };
}
