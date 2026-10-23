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
import {
  scoreChecks,
  summaryForVerdict,
  verdictFromChecklist,
} from "@/lib/score";

export type {
  ChecklistSource,
  ReviewChecklistItem,
  ReviewLineComment,
  ReviewResult,
} from "@/lib/review-format";
export { formatReviewMarkdown } from "@/lib/review-format";

const CONTRIBUTING_MAX = 6000;
const PATCHES_MAX_TOTAL = 30_000;

const CONTRIBUTING_FALLBACK_DETAIL =
  "Couldn't check CONTRIBUTING.md, review it by hand";

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

function hasContributingRules(
  raw: ReviewOutput,
): raw is ReviewOutput & {
  contributing_rules: { status: CheckStatus; detail: string | null };
} {
  return (
    raw.contributing_rules != null &&
    (raw.contributing_rules.status === "pass" ||
      raw.contributing_rules.status === "warn" ||
      raw.contributing_rules.status === "fail")
  );
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

async function callReviewModel(user: string): Promise<ReviewOutput> {
  return generateJson({
    task: "review",
    system: REVIEW_SYSTEM,
    user,
    schema: reviewSchema,
    schemaName: "review",
    effort: "medium",
  });
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

  let raw = await callReviewModel(user);
  if (!hasContributingRules(raw)) {
    raw = await callReviewModel(user);
  }

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

  // issue_done_when from checklist array
  const issueItem = raw.checklist.find((c) => c.id === "issue_done_when");
  let issueDoneWhenStatus: CheckStatus = "warn";
  if (issueItem) {
    const status = mergeAiStatus(issueItem.status, [
      linked?.status ?? "warn",
    ]);
    issueDoneWhenStatus = status;
    checklist.push({
      id: "issue_done_when",
      label: issueItem.label || "Issue Done when",
      status,
      evidence: issueItem.evidence,
      fix: status === "pass" ? null : issueItem.fix,
      source: "ai",
    });
  } else {
    checklist.push({
      id: "issue_done_when",
      label: "Issue Done when",
      status: "warn",
      evidence: "Model did not return this item; re-check the issue Done when list by hand.",
      fix: "Compare the diff to the issue’s Done when items yourself.",
      source: "ai",
    });
  }

  // contributing_rules from required top-level field (fallback after retry)
  let aiContributingStatus: CheckStatus = "warn";
  if (hasContributingRules(raw)) {
    const status = mergeAiStatus(raw.contributing_rules.status, [
      branch?.status ?? "pass",
      forbidden?.status ?? "pass",
    ]);
    aiContributingStatus = status;
    const detail = raw.contributing_rules.detail?.trim() || null;
    const fromChecklist = raw.checklist.find(
      (c) => c.id === "contributing_rules",
    );
    checklist.push({
      id: "contributing_rules",
      label: "CONTRIBUTING rules",
      status,
      evidence:
        detail ||
        fromChecklist?.evidence ||
        "Checked against CONTRIBUTING.md",
      fix:
        status === "pass"
          ? null
          : fromChecklist?.fix ||
            "Follow the named CONTRIBUTING.md rule in the evidence.",
      source: "ai",
    });
  } else {
    aiContributingStatus = "warn";
    checklist.push({
      id: "contributing_rules",
      label: "CONTRIBUTING rules",
      status: "warn",
      evidence: CONTRIBUTING_FALLBACK_DETAIL,
      fix: "Open CONTRIBUTING.md and check branch, description, and check commands yourself.",
      source: "ai",
    });
  }

  const { score } = scoreChecks(checks, {
    issueDoneWhenStatus,
    aiContributingStatus,
  });

  const verdict = verdictFromChecklist(checklist);
  const summary = summaryForVerdict(verdict, checklist, raw.summary);

  const line_comments = filterLineComments(
    raw.line_comments,
    args.files,
    args.owner,
    args.repo,
    args.prNumber,
  );

  return {
    summary,
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
