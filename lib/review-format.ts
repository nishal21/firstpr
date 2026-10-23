import type { CheckResult, CheckStatus } from "@/lib/checks";
import type { Verdict } from "@/lib/score";

export type ChecklistSource = "rule" | "ai";

export type ReviewChecklistItem = {
  id: string;
  label: string;
  status: CheckStatus;
  evidence: string;
  fix: string | null;
  source: ChecklistSource;
};

export type ReviewLineComment = {
  path: string;
  line: number;
  severity: "blocker" | "suggestion" | "nit";
  comment: string;
  filesChangedUrl: string | null;
};

export type ReviewResult = {
  summary: string;
  checklist: ReviewChecklistItem[];
  line_comments: ReviewLineComment[];
  questions_a_maintainer_would_ask: string[];
  encouragement: string;
  score: number;
  verdict: Verdict;
  checks: CheckResult[];
};

/** Markdown for “Copy as PR comment”. */
export function formatReviewMarkdown(result: ReviewResult): string {
  const verdictLabel =
    result.verdict === "ready"
      ? "Ready to merge"
      : result.verdict === "almost"
        ? "Almost there"
        : "Not yet";

  const lines: string[] = [
    `## FirstPR maintainer-ready check: ${result.score}/100 — ${verdictLabel}`,
    "",
    result.summary,
    "",
    "### Checklist",
  ];

  for (const item of result.checklist) {
    const icon =
      item.status === "pass" ? "✅" : item.status === "warn" ? "⚠️" : "❌";
    const tag = item.source === "ai" ? "AI" : "Rule";
    lines.push(
      `- ${icon} **${item.label}** (${tag}): ${item.evidence}${
        item.fix ? ` → _${item.fix}_` : ""
      }`,
    );
  }

  if (result.line_comments.length > 0) {
    lines.push("", "### Line notes");
    for (const c of result.line_comments) {
      lines.push(
        `- \`${c.path}:${c.line}\` (${c.severity}): ${c.comment}`,
      );
    }
  }

  if (result.questions_a_maintainer_would_ask.length > 0) {
    lines.push("", "### Questions a maintainer would ask");
    for (const q of result.questions_a_maintainer_would_ask) {
      lines.push(`- ${q}`);
    }
  }

  lines.push("", `_${result.encouragement}_`);
  lines.push(
    "",
    "_Scored by [FirstPR](https://firstpr-coral.vercel.app/) — no model score used._",
  );
  return lines.join("\n");
}
