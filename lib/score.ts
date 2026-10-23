import type { CheckResult, CheckStatus } from "@/lib/checks";

export type Verdict = "ready" | "almost" | "not_yet";

export type ScoreResult = {
  score: number;
  /** Prefer verdictFromChecklist for the badge; this is score-band only. */
  verdict: Verdict;
};

const WEIGHTS = {
  linked_issue: 15,
  issue_done_when: 30,
  contributing_rules: 20,
  description: 15,
  check_evidence: 10,
  tests_touched: 5,
  scope: 5,
} as const;

function statusPoints(status: CheckStatus): number {
  if (status === "pass") return 1;
  if (status === "warn") return 0.5;
  if (status === "na") return 0; // excluded via weight skip
  return 0;
}

function isScored(status: CheckStatus | undefined): boolean {
  return status !== undefined && status !== "na";
}

function byId(checks: CheckResult[], id: string): CheckResult | undefined {
  return checks.find((c) => c.id === id);
}

export function verdictLabel(v: Verdict): string {
  if (v === "ready") return "Ready to merge";
  if (v === "almost") return "Almost ready";
  return "Needs changes";
}

/**
 * Badge follows the checklist: any fail → Needs changes; any warn → Almost ready;
 * all pass → Ready to merge. N/A items are ignored.
 */
export function verdictFromChecklist(
  items: { status: CheckStatus }[],
): Verdict {
  const scored = items.filter((i) => i.status !== "na");
  if (scored.some((i) => i.status === "fail")) return "not_yet";
  if (scored.some((i) => i.status === "warn")) return "almost";
  return "ready";
}

/**
 * One-line summary that matches the badge (checklist-driven).
 */
export function summaryForVerdict(
  verdict: Verdict,
  items: { label: string; status: CheckStatus }[],
  aiSummary: string,
): string {
  const scored = items.filter((i) => i.status !== "na");
  const fails = scored.filter((i) => i.status === "fail").map((i) => i.label);
  const warns = scored.filter((i) => i.status === "warn").map((i) => i.label);
  const ai = aiSummary.trim();

  if (verdict === "ready") {
    return ai || "Ready to merge — every checklist item passed.";
  }
  if (verdict === "almost") {
    const focus = warns.length > 0 ? warns.join(", ") : "a few items";
    const head = `Almost ready — ${focus} still need attention.`;
    return ai ? `${head} ${ai}` : head;
  }
  const focus = fails.length > 0 ? fails.join(", ") : "checklist items";
  const head = `Needs changes — fix ${focus}.`;
  return ai ? `${head} ${ai}` : head;
}

export const PASTED_DIFF_SUMMARY =
  "Checked the diff only. Open a PR to check the rest.";

/**
 * Turn checklist statuses into a 0–100 score.
 * N/A items (and their weights) are dropped; remaining weights are scaled to 100.
 */
export function scoreChecks(
  checks: CheckResult[],
  opts?: {
    /** AI contributing_rules item status; defaults to warn until AI exists. */
    aiContributingStatus?: CheckStatus;
    /** AI issue_done_when status; defaults to warn until AI exists. */
    issueDoneWhenStatus?: CheckStatus;
  },
): ScoreResult {
  const linked = byId(checks, "linked_issue");
  const branch = byId(checks, "branch_name");
  const forbidden = byId(checks, "forbidden_files");
  const description = byId(checks, "description");
  const evidence = byId(checks, "check_evidence");
  const tests = byId(checks, "tests_touched");
  const scope = byId(checks, "scope");

  const aiContributing = opts?.aiContributingStatus ?? "warn";
  const issueDoneWhen = opts?.issueDoneWhenStatus ?? "warn";

  // contributing_rules = average of scored parts only (skip N/A branch, etc.)
  const contributingParts: number[] = [];
  if (isScored(branch?.status)) {
    contributingParts.push(statusPoints(branch!.status));
  }
  if (isScored(forbidden?.status)) {
    contributingParts.push(statusPoints(forbidden!.status));
  }
  if (isScored(aiContributing)) {
    contributingParts.push(statusPoints(aiContributing));
  }

  type Weighted = { weight: number; points: number };
  const terms: Weighted[] = [];

  if (isScored(linked?.status)) {
    terms.push({
      weight: WEIGHTS.linked_issue,
      points: statusPoints(linked!.status),
    });
  }
  if (isScored(issueDoneWhen)) {
    terms.push({
      weight: WEIGHTS.issue_done_when,
      points: statusPoints(issueDoneWhen),
    });
  }
  if (contributingParts.length > 0) {
    const avg =
      contributingParts.reduce((a, b) => a + b, 0) / contributingParts.length;
    terms.push({ weight: WEIGHTS.contributing_rules, points: avg });
  }
  if (isScored(description?.status)) {
    terms.push({
      weight: WEIGHTS.description,
      points: statusPoints(description!.status),
    });
  }
  if (isScored(evidence?.status)) {
    terms.push({
      weight: WEIGHTS.check_evidence,
      points: statusPoints(evidence!.status),
    });
  }
  if (isScored(tests?.status)) {
    terms.push({
      weight: WEIGHTS.tests_touched,
      points: statusPoints(tests!.status),
    });
  }
  if (isScored(scope?.status)) {
    terms.push({
      weight: WEIGHTS.scope,
      points: statusPoints(scope!.status),
    });
  }

  const totalWeight = terms.reduce((s, t) => s + t.weight, 0);
  let score = 0;
  if (totalWeight > 0) {
    const earned = terms.reduce((s, t) => s + t.weight * t.points, 0);
    score = Math.round((100 * earned) / totalWeight);
  }
  score = Math.min(100, Math.max(0, score));

  const verdict: Verdict =
    score >= 80 ? "ready" : score >= 55 ? "almost" : "not_yet";

  return { score, verdict };
}
