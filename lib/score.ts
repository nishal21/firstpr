import type { CheckResult, CheckStatus } from "@/lib/checks";

export type Verdict = "ready" | "almost" | "not_yet";

export type ScoreResult = {
  score: number;
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

/**
 * Turn checklist statuses into a 0–100 score.
 * Until AI review exists, issue_done_when and the AI contributing item are warn.
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
