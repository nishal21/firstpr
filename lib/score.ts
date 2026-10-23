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

/** Any red AI checklist item caps the final score at this. */
export const AI_FAIL_SCORE_CAP = 60;

/**
 * Turn checklist statuses into a 0–100 score from rule items + AI items.
 * N/A items (and their weights) are dropped; remaining weights are scaled to 100.
 * A fail on any AI item caps the score at AI_FAIL_SCORE_CAP.
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

  // Rule parts of contributing_rules (branch + forbidden); AI part is separate.
  const ruleContributingParts: number[] = [];
  if (isScored(branch?.status)) {
    ruleContributingParts.push(statusPoints(branch!.status));
  }
  if (isScored(forbidden?.status)) {
    ruleContributingParts.push(statusPoints(forbidden!.status));
  }

  type Weighted = { weight: number; points: number };
  const terms: Weighted[] = [];

  // —— Rule items ——
  if (isScored(linked?.status)) {
    terms.push({
      weight: WEIGHTS.linked_issue,
      points: statusPoints(linked!.status),
    });
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
  // Split contributing_rules weight: half rule avg (branch/forbidden), half AI.
  const contribRuleWeight = WEIGHTS.contributing_rules / 2;
  const contribAiWeight = WEIGHTS.contributing_rules / 2;
  if (ruleContributingParts.length > 0) {
    const avg =
      ruleContributingParts.reduce((a, b) => a + b, 0) /
      ruleContributingParts.length;
    terms.push({ weight: contribRuleWeight, points: avg });
  }
  // If no rule contributing parts (e.g. pasted diff, no forbidden hit path),
  // give the full contributing weight to the AI item below.

  // —— AI items ——
  if (isScored(issueDoneWhen)) {
    terms.push({
      weight: WEIGHTS.issue_done_when,
      points: statusPoints(issueDoneWhen),
    });
  }
  if (isScored(aiContributing)) {
    const aiWeight =
      ruleContributingParts.length > 0
        ? contribAiWeight
        : WEIGHTS.contributing_rules;
    terms.push({ weight: aiWeight, points: statusPoints(aiContributing) });
  }

  const totalWeight = terms.reduce((s, t) => s + t.weight, 0);
  let score = 0;
  if (totalWeight > 0) {
    const earned = terms.reduce((s, t) => s + t.weight * t.points, 0);
    score = Math.round((100 * earned) / totalWeight);
  }
  score = Math.min(100, Math.max(0, score));

  const aiFail =
    issueDoneWhen === "fail" || aiContributing === "fail";
  if (aiFail) {
    // Red AI item: never above 60. When rule items are clean, keep the
    // score in the mid band so a single AI fail does not collapse pasted-diff
    // scores (where N/A rows already removed a lot of weight).
    const anyRuleFail = checks.some(
      (c) =>
        c.status === "fail" &&
        c.id !== "issue_done_when" &&
        c.id !== "contributing_rules",
    );
    score = Math.min(score, AI_FAIL_SCORE_CAP);
    if (!anyRuleFail) {
      score = Math.min(AI_FAIL_SCORE_CAP, Math.max(score, 55));
    }
  }

  const verdict: Verdict =
    score >= 80 ? "ready" : score >= 55 ? "almost" : "not_yet";

  return { score, verdict };
}
