import type { ExplainIssueResult } from "@/lib/explain";

const SITE_ORIGIN = "https://firstpr-coral.vercel.app";

/** Markdown reply for `/firstpr explain` on an issue. */
export function formatExplainWebhookComment(
  explained: ExplainIssueResult,
  level1Hint: string,
): string {
  const { owner, repo, issue, explanation, citations } = explained;
  const pageUrl = `${SITE_ORIGIN}/issue/${owner}/${repo}/${issue.number}`;

  const lines: string[] = [
    "## FirstPR explain",
    "",
    explanation.summary,
    "",
    "### Where to look",
  ];

  if (citations.length === 0) {
    lines.push("_No verified file citations yet — open the full page for more._");
  } else {
    for (const c of citations) {
      const range =
        c.start === c.end ? `L${c.start}` : `L${c.start}–L${c.end}`;
      lines.push(`- [\`${c.path}\` ${range}](${c.url}) — ${c.why}`);
    }
  }

  lines.push("", "### Done when");
  if (explanation.done_when.length === 0) {
    lines.push("- _(none listed)_");
  } else {
    for (const item of explanation.done_when) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", "### Hint (level 1)", level1Hint.trim() || "_Open the full page for hints._");

  lines.push(
    "",
    "---",
    `Full explanation (hints ladder, learn links): ${pageUrl}`,
    "",
    "_FirstPR never writes your fix. You write the PR._",
  );

  return lines.join("\n");
}

export function firstPrSiteOrigin(): string {
  return SITE_ORIGIN;
}

/* ------------------------------------------------------------------ */
/* PR summary comment                                                  */
/* ------------------------------------------------------------------ */

type CheckStatus = "pass" | "warn" | "fail" | "na";

/** Hidden marker that identifies the one FirstPRbot summary on a PR. */
export const PR_COMMENT_MARKER = "<!-- firstprbot:pr-summary -->";

/** First lines of comments posted before the single-comment format. */
export const LEGACY_PR_COMMENT_PREFIXES = [
  "## FirstPR mentor-ready check",
  "FirstPR hit an error while reviewing this PR.",
];

export type PrCommentVerdict = "ready" | "needs_changes" | "no_issue";

export type PrCommentInput = {
  owner: string;
  repo: string;
  number: number;
  prUrl: string;
  headSha: string;
  author: string | null;
  firstTimeContributor: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  /** Issue number from `Fixes #N`, even if it couldn't be loaded. */
  linkedIssueNumber: number | null;
  linkedIssue: {
    number: number;
    title: string;
    labels: string[];
    assignees: string[];
    htmlUrl: string;
  } | null;
  files: { filename: string; additions: number; deletions: number }[];
  requireLinkedIssue: boolean;
  review: {
    score: number;
    checklist: {
      id: string;
      label: string;
      status: CheckStatus;
      evidence: string;
      fix: string | null;
      source: "rule" | "ai";
    }[];
    line_comments: {
      path: string;
      line: number;
      severity: "blocker" | "suggestion" | "nit";
      comment: string;
      filesChangedUrl: string | null;
    }[];
    questions_a_maintainer_would_ask: string[];
  };
};

const GOOD_FIRST_RE =
  /good[\s_-]*first|first[\s_-]*timers?|beginner|starter|easy/i;
const TEST_PATH_RE =
  /(^|\/)(tests?|__tests__|spec|specs)\/|\.(test|spec)\.[a-z0-9]+$|_test\.(go|py|rs)$|(^|\/)test_[^/]+\.py$/i;

/** Squash text into one safe table cell / list line. */
function cell(text: string, max = 110): string {
  let t = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .replace(/@(?=[A-Za-z0-9])/g, "@\u200b")
    .replace(/<!--/g, "&lt;!--")
    .trim();
  if (t.length > max) t = `${t.slice(0, max - 1).trimEnd()}…`;
  return t;
}

function find(input: PrCommentInput, id: string) {
  return input.review.checklist.find((c) => c.id === id);
}

function word(status: CheckStatus | undefined, yes = "Yes", partly = "Partly", no = "No"): string {
  if (status === "pass") return yes;
  if (status === "warn") return partly;
  if (status === "fail") return no;
  return "n/a";
}

/** Checklist items that count toward the verdict. */
function counted(input: PrCommentInput) {
  return input.review.checklist.filter(
    (c) =>
      c.status !== "na" &&
      !(c.id === "linked_issue" && !input.requireLinkedIssue),
  );
}

export function prCommentVerdict(input: PrCommentInput): PrCommentVerdict {
  if (input.requireLinkedIssue && !input.linkedIssue) return "no_issue";
  const items = counted(input);
  if (items.some((c) => c.status === "fail" || c.status === "warn")) {
    return "needs_changes";
  }
  return "ready";
}

function headline(input: PrCommentInput, verdict: PrCommentVerdict): string[] {
  const size = `${input.changedFiles} file${input.changedFiles === 1 ? "" : "s"}, +${input.additions} −${input.deletions}`;
  if (verdict === "no_issue") {
    const why = input.linkedIssueNumber
      ? `#${input.linkedIssueNumber} is mentioned but couldn't be loaded from this repo.`
      : "The description doesn't say which issue this closes.";
    return [`### 🔗 Not linked to an issue`, "", `${why} (${size})`];
  }
  const open = counted(input).filter((c) => c.status !== "pass").length;
  if (verdict === "needs_changes") {
    return [
      `### 🛠️ Needs a few changes`,
      "",
      `${open} item${open === 1 ? "" : "s"} to sort out before a full review. (${size})`,
    ];
  }
  return [
    `### ✅ Ready for review`,
    "",
    `Every check passed. (${size})`,
  ];
}

function checklistTable(input: PrCommentInput): string[] {
  const rows: [string, string, string][] = [];
  const issue = input.linkedIssue;

  if (issue) {
    rows.push(["Linked issue", "Yes", `[#${issue.number}](${issue.htmlUrl}) ${cell(issue.title, 70)}`]);
    const gfi = issue.labels.find((l) => GOOD_FIRST_RE.test(l));
    rows.push(["Good first issue", gfi ? "Yes" : "No", gfi ? `Labeled \`${cell(gfi, 40)}\`` : "No beginner label on the issue"]);
    const author = input.author?.toLowerCase();
    const assigned = Boolean(author && issue.assignees.some((a) => a.toLowerCase() === author));
    rows.push([
      "Assigned to author",
      assigned ? "Yes" : "No",
      assigned
        ? "Issue is assigned to the PR author"
        : issue.assignees.length > 0
          ? `Assigned to ${issue.assignees.map((a) => `\`${cell(a, 39)}\``).join(", ")}`
          : "Nobody is assigned yet",
    ]);
  } else {
    rows.push([
      "Linked issue",
      "No",
      input.linkedIssueNumber
        ? `#${input.linkedIssueNumber} couldn't be loaded`
        : "No `Fixes #N` in the description",
    ]);
  }

  const done = find(input, "issue_done_when");
  if (issue && done) rows.push(["Covers the issue", word(done.status), cell(done.evidence)]);

  const contributing = find(input, "contributing_rules");
  if (contributing) {
    rows.push(["CONTRIBUTING.md", word(contributing.status), cell(contributing.evidence)]);
  }

  const tests = find(input, "tests_touched");
  if (tests) rows.push(["Tests", word(tests.status, "Yes", "Missing", "Missing"), cell(tests.evidence)]);

  const scope = find(input, "scope");
  if (scope) {
    rows.push([
      "Scope",
      word(scope.status, "Focused", "Large", "Too wide"),
      `${input.changedFiles} file${input.changedFiles === 1 ? "" : "s"}, +${input.additions} −${input.deletions}${scope.status !== "pass" ? ", more than the issue likely needs" : ""}`,
    ]);
  }

  rows.push([
    "First-time contributor",
    input.firstTimeContributor ? "Yes" : "No",
    input.firstTimeContributor ? "First PR to this repo" : "Has contributed here before",
  ]);

  return [
    "| Check | Result | Notes |",
    "| --- | --- | --- |",
    ...rows.map(([a, b, c]) => {
      const neutral = a === "First-time contributor" || ["Yes", "Focused", "n/a"].includes(b);
      return `| ${a} | ${neutral ? b : `**${b}**`} | ${c} |`;
    }),
  ];
}

function maintainerFocus(input: PrCommentInput): string[] {
  const out: string[] = [];
  const order = { blocker: 0, suggestion: 1, nit: 2 } as const;
  const notes = [...input.review.line_comments]
    .filter((c) => c.severity !== "nit")
    .sort((a, b) => order[a.severity] - order[b.severity]);

  for (const n of notes) {
    if (out.length >= 3) break;
    const loc = `\`${cell(n.path, 80)}:${n.line}\``;
    const link = n.filesChangedUrl ? `[${loc}](${n.filesChangedUrl})` : loc;
    out.push(`- ${link}: ${cell(n.comment, 140)}`);
  }

  const forbidden = find(input, "forbidden_files");
  if (out.length < 3 && forbidden?.status === "fail") {
    out.push(`- ${cell(forbidden.evidence, 140)}`);
  }

  if (out.length === 0) {
    const biggest = [...input.files]
      .filter((f) => !TEST_PATH_RE.test(f.filename))
      .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
      .slice(0, 2);
    biggest.forEach((f, i) => {
      out.push(
        `- [\`${cell(f.filename, 80)}\`](${input.prUrl}/files) (+${f.additions} −${f.deletions})${i === 0 ? ", the largest change in this PR" : ""}`,
      );
    });
  }
  return out;
}

function contributorSteps(input: PrCommentInput, verdict: PrCommentVerdict): string[] {
  const steps: string[] = [];
  if (verdict === "no_issue") {
    steps.push(
      input.linkedIssueNumber
        ? `Check that #${input.linkedIssueNumber} is an issue in this repo, then keep \`Fixes #${input.linkedIssueNumber}\` in the description.`
        : "Add `Fixes #123` (your issue number) to the PR description. If there's no issue yet, open one first and ask if the change is wanted.",
    );
  }

  const issue = input.linkedIssue;
  const author = input.author?.toLowerCase();
  if (issue && author && !issue.assignees.some((a) => a.toLowerCase() === author)) {
    steps.push(`Comment on #${issue.number} to ask to be assigned, so nobody else picks it up.`);
  }

  const open = counted(input)
    .filter((c) => c.status !== "pass" && c.id !== "linked_issue" && c.fix)
    .sort((a, b) => (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1));
  for (const c of open) {
    if (steps.length >= 3) break;
    steps.push(`${c.label}: ${cell(c.fix ?? "", 150)}`);
  }

  if (steps.length === 0) {
    steps.push("Nothing to change right now. A maintainer will take it from here.");
  }
  return steps.slice(0, 3).map((s, i) => `${i + 1}. ${s}`);
}

function fullScoring(input: PrCommentInput): string[] {
  const lines = [
    "<details>",
    `<summary>Full scoring: ${input.review.score}/100</summary>`,
    "",
    "| Check | Result | Source | Evidence |",
    "| --- | --- | --- | --- |",
  ];
  for (const c of input.review.checklist) {
    lines.push(
      `| ${cell(c.label, 40)} | ${word(c.status, "Pass", "Check", "Fail")} | ${c.source === "ai" ? "AI read" : "Rule"} | ${cell(c.evidence, 160)} |`,
    );
  }
  const qs = input.review.questions_a_maintainer_would_ask.slice(0, 3);
  if (qs.length > 0) {
    lines.push("", "**Questions a maintainer might ask**", "");
    for (const q of qs) lines.push(`- ${cell(q, 200)}`);
  }
  lines.push(
    "",
    `Checked commit \`${input.headSha.slice(0, 7)}\`. Rule checks come from the PR, the issue and CONTRIBUTING.md; "AI read" items compare the diff with the issue and can be wrong.`,
    "",
    "</details>",
  );
  return lines;
}

export function prReviewPageUrl(prUrl: string): string {
  return `${SITE_ORIGIN}/review?pr=${encodeURIComponent(prUrl)}`;
}

function footer(input: PrCommentInput): string[] {
  return [
    "---",
    `<sub>[Open this PR in FirstPR](${prReviewPageUrl(input.prUrl)}) · Updates on every push, or comment \`/firstpr recheck\` · Turn off with \`enabled: false\` in \`.github/firstpr.yml\` · FirstPRbot</sub>`,
  ];
}

/** The single FirstPRbot comment on a PR. Edited in place on new pushes. */
export function formatPrComment(input: PrCommentInput): string {
  const verdict = prCommentVerdict(input);
  return [
    PR_COMMENT_MARKER,
    ...headline(input, verdict),
    "",
    ...checklistTable(input),
    "",
    "#### What a maintainer should look at",
    "",
    ...maintainerFocus(input),
    "",
    "#### For the contributor",
    "",
    ...(input.firstTimeContributor ? ["Thanks for your first PR here.", ""] : []),
    ...contributorSteps(input, verdict),
    "",
    ...fullScoring(input),
    "",
    ...footer(input),
  ].join("\n");
}

/** Shown in place of the summary when a requested check couldn't finish. */
export function formatPrCommentError(prUrl: string): string {
  return [
    PR_COMMENT_MARKER,
    "### FirstPRbot couldn't finish this check",
    "",
    "GitHub or the review model didn't answer in time. Nothing is wrong with the PR because of this.",
    "",
    "---",
    `<sub>Push a commit or comment \`/firstpr recheck\` to try again · [Open this PR in FirstPR](${prReviewPageUrl(prUrl)}) · FirstPRbot</sub>`,
  ].join("\n");
}
