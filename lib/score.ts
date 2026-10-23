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
  return 0;
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
 * all pass → Ready to merge.
 */
export function verdictFromChecklist(
  items: { status: CheckStatus }[],
): Verdict {
  if (items.some((i) => i.status === "fail")) return "not_yet";
  if (items.some((i) => i.status === "warn")) return "almost";
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
  const fails = items.filter((i) => i.status === "fail").map((i) => i.label);
  const warns = items.filter((i) => i.status === "warn").map((i) => i.label);
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

/**
 * Turn checklist statuses into a 0–100 score.
 * Until AI review exists, issue_done_when and the AI contributing item are warn.
 * Verdict from score bands is legacy; UI uses verdictFromChecklist.
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

  const contributingParts = [
    statusPoints(branch?.status ?? "warn"),
    statusPoints(forbidden?.status ?? "warn"),
    statusPoints(aiContributing),
  ];
  const contributingAvg =
    contributingParts.reduce((a, b) => a + b, 0) / contributingParts.length;

  let score =
    WEIGHTS.linked_issue * statusPoints(linked?.status ?? "fail") +
    WEIGHTS.issue_done_when * statusPoints(issueDoneWhen) +
    WEIGHTS.contributing_rules * contributingAvg +
    WEIGHTS.description * statusPoints(description?.status ?? "warn") +
    WEIGHTS.check_evidence * statusPoints(evidence?.status ?? "warn") +
    WEIGHTS.tests_touched * statusPoints(tests?.status ?? "warn") +
    WEIGHTS.scope * statusPoints(scope?.status ?? "warn");

  score = Math.round(Math.min(100, Math.max(0, score)));

  const verdict: Verdict =
    score >= 80 ? "ready" : score >= 55 ? "almost" : "not_yet";

  return { score, verdict };
}
