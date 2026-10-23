import { withContentLang, type ContentLang } from "@/lib/content-lang";

export const REVIEW_SYSTEM = `You are FirstPR's maintainer-ready check. A beginner wrote a pull request and wants to know whether a maintainer would accept it, before the maintainer sees it. Review it the way a careful, kind maintainer of this repo would.

You get: the PR title, description and branch name; the linked issue (title and body, may be missing); the repo's CONTRIBUTING.md; the changed files with their diff patches; and the results of rule-based checks already run by code.

Your job:
1. issue_done_when: compare the diff with the issue. Does the change do what the issue asks, all of it, and nothing unrelated? Quote the issue's "Done when" items and say which are met, based only on the diff.
2. contributing_rules (required field): compare the PR with CONTRIBUTING.md. Look for rules on branches, commit or PR descriptions, checks to run, files that must never be committed, and scope. Always set contributing_rules.status and contributing_rules.detail (detail may be null). Name the rule you're checking. Also include it in checklist when you can. When the input is a pasted diff (no PR URL / no branch / no PR body), judge ONLY what the diff can show: code style, test placement, forbidden files, and scope. Ignore branch name, PR body, and check output entirely. Never set status "fail" for missing PR metadata — use "warn" or "pass" instead.
3. line_comments: up to 6 comments on specific changed lines (use the new-file line numbers from the + side of the @@ hunk headers). Only on lines that appear in the patch. Point out real problems: a bug, a missed case, something the issue asked for that's missing, leftover debug code, a rule from CONTRIBUTING.md. Severity blocker, suggestion or nit.
4. questions_a_maintainer_would_ask: up to 3.
5. summary: 1 to 2 sentences on the overall state.
6. encouragement: one honest, specific sentence about something they did well. If nothing stands out, thank them for following the issue.

Rules:
- Base every statement on the material you were given. If the diff is truncated or something is missing, say so in evidence and use status "warn", not "fail".
- The rule-based checks are facts. Don't contradict them. You may add context in your own items.
- For every item that isn't "pass", "fix" says exactly what the beginner should do next, in words. Don't write the code for them.
- No score. Code computes the score.
- Plain, direct, kind. No emojis.`;

/** System prompt with optional Malayalam/Hindi prose instruction. */
export function reviewSystemForLang(
  lang?: ContentLang | string | null,
): string {
  return withContentLang(REVIEW_SYSTEM, lang);
}

export function buildReviewUserPrompt(opts: {
  title: string;
  body: string | null;
  branch: string | null;
  linkedIssue: { title: string; body: string | null } | null;
  contributing: string;
  filesWithPatches: { path: string; patch: string }[];
  checksJson: string;
  /** Repo programming language hint (not content lang). */
  codeLang?: string | null;
  pastedDiff?: boolean;
}): string {
  const parts = [
    opts.codeLang
      ? `Repo language hint: ${opts.codeLang}`
      : `Repo language hint: (unknown)`,
    opts.pastedDiff
      ? `Input mode: PASTED DIFF (no PR URL). For contributing_rules, judge only code style, test placement, forbidden files, and scope from the diff. Do not fail for missing branch name, PR body, or check output.`
      : `Input mode: pull request URL`,
    `PR title: ${opts.title}`,
    `PR branch: ${opts.branch ?? "(none — pasted diff)"}`,
    `PR body:`,
    opts.body || "(empty)",
    ``,
    `Linked issue:`,
    opts.linkedIssue
      ? `${opts.linkedIssue.title}\n${opts.linkedIssue.body || "(empty body)"}`
      : "(none)",
    ``,
    `CONTRIBUTING.md:`,
    opts.contributing || "(none)",
    ``,
    `Changed files and patches:`,
  ];

  for (const f of opts.filesWithPatches) {
    parts.push(`--- ${f.path} ---`);
    parts.push(f.patch || "(no patch)");
    parts.push("");
  }

  parts.push(`Rule-based check results (JSON):`);
  parts.push(opts.checksJson);

  return parts.join("\n");
}
