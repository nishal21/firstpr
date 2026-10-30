// Run with: node scripts/verify-bot-comment.ts [outdir]
// Renders the FirstPRbot PR summary for three sample PRs and checks the shape.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseBotConfig } from "../lib/bot-config.ts";
import { parseLinkedIssueNumbers } from "../lib/linked-issues.ts";
import {
  diffUrl,
  formatPrComment,
  formatReliabilityLine,
  prCommentVerdict,
  PR_COMMENT_MARKER,
  type PrCommentInput,
} from "../lib/webhook-format.ts";

let failed = 0;
function expect(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`FAIL ${name}`);
  }
}

const PR = "https://github.com/acme/widgets/pull/42";
const files = [
  { filename: "src/date/format.ts", additions: 18, deletions: 4 },
  { filename: "src/date/format.test.ts", additions: 22, deletions: 0 },
  { filename: "docs/dates.md", additions: 3, deletions: 1 },
];

const base: PrCommentInput = {
  owner: "acme",
  repo: "widgets",
  number: 42,
  prUrl: PR,
  headSha: "3f9c2a1d8e7b6a5c4d3e2f1a0b9c8d7e6f5a4b3c",
  author: "maya-dev",
  firstTimeContributor: true,
  additions: 43,
  deletions: 5,
  changedFiles: 3,
  linkedIssueNumber: 17,
  linkedIssue: {
    number: 17,
    title: "Dates show in UTC instead of the user's timezone",
    labels: ["bug", "good first issue"],
    assignees: ["maya-dev"],
    htmlUrl: "https://github.com/acme/widgets/issues/17",
  },
  files,
  requireLinkedIssue: true,
  review: {
    score: 94,
    checklist: [
      { id: "linked_issue", label: "Linked issue", status: "pass", evidence: "Fixes #17 (open)", fix: null, source: "rule" },
      { id: "branch_name", label: "Branch name", status: "pass", evidence: "fix/17-local-dates matches fix/<issue>-<slug>", fix: null, source: "rule" },
      { id: "description", label: "Description", status: "pass", evidence: "Explains the change and how it was tested", fix: null, source: "rule" },
      { id: "check_evidence", label: "Check output", status: "pass", evidence: "npm test output pasted in the description", fix: null, source: "rule" },
      { id: "tests_touched", label: "Tests touched", status: "pass", evidence: "Test files were changed", fix: null, source: "rule" },
      { id: "scope", label: "Scope", status: "pass", evidence: "3 file(s), 48 lines", fix: null, source: "rule" },
      { id: "forbidden_files", label: "Forbidden files", status: "pass", evidence: "No lockfiles or generated files changed", fix: null, source: "rule" },
      { id: "issue_done_when", label: "Issue Done when", status: "pass", evidence: "formatDate now takes the user's timezone and the test covers IST and PST", fix: null, source: "ai" },
      { id: "contributing_rules", label: "CONTRIBUTING rules", status: "pass", evidence: "Branch, commit style and test placement follow CONTRIBUTING.md", fix: null, source: "ai" },
    ],
    line_comments: [
      { path: "src/date/format.ts", line: 48, severity: "suggestion", comment: "reads the timezone from the request now", filesChangedUrl: null },
    ],
    questions_a_maintainer_would_ask: ["Does formatDate still default to UTC when no timezone is passed?"],
  },
};

const needs: PrCommentInput = {
  ...base,
  number: 43,
  prUrl: "https://github.com/acme/widgets/pull/43",
  firstTimeContributor: false,
  author: "sam-k",
  additions: 212,
  deletions: 40,
  changedFiles: 9,
  linkedIssue: { ...base.linkedIssue!, assignees: [] },
  files: [
    { filename: "src/date/format.ts", additions: 120, deletions: 30 },
    { filename: "package-lock.json", additions: 80, deletions: 8 },
    { filename: "src/date/index.ts", additions: 12, deletions: 2 },
  ],
  review: {
    score: 58,
    checklist: base.review.checklist.map((c) => {
      if (c.id === "tests_touched") return { ...c, status: "fail" as const, evidence: "No test files changed", fix: "Add a test that shows the bug from #17 is fixed." };
      if (c.id === "scope") return { ...c, status: "warn" as const, evidence: "9 files changed, 252 lines changed", fix: "Keep the PR to what #17 asks; move the refactor to its own PR." };
      if (c.id === "forbidden_files") return { ...c, status: "fail" as const, evidence: "package-lock.json changed, CONTRIBUTING.md says not to commit lockfiles", fix: "Revert package-lock.json." };
      if (c.id === "issue_done_when") return { ...c, evidence: "formatDate now takes the user's timezone from the request" };
      if (c.id === "contributing_rules") return { ...c, status: "warn" as const, evidence: "Lockfile changed; commit messages don't use the type: prefix", fix: "Reword commits as fix: ... per CONTRIBUTING.md." };
      return c;
    }),
    line_comments: [
      { path: "src/date/format.ts", line: 48, severity: "blocker", comment: "Timezone is read from the server clock here, so users still see UTC on Vercel.", filesChangedUrl: "https://github.com/acme/widgets/pull/43/files#diff-abc" },
      { path: "src/date/index.ts", line: 3, severity: "suggestion", comment: "This re-export renames formatDate | which breaks existing imports.", filesChangedUrl: null },
      { path: "src/date/format.ts", line: 90, severity: "nit", comment: "Typo in comment.", filesChangedUrl: null },
    ],
    questions_a_maintainer_would_ask: ["Why did the lockfile change?", "Is the refactor of index.ts needed for #17?"],
  },
};

const noIssue: PrCommentInput = {
  ...base,
  number: 44,
  prUrl: "https://github.com/acme/widgets/pull/44",
  author: "@everyone",
  linkedIssueNumber: null,
  linkedIssue: null,
  review: {
    score: 61,
    checklist: base.review.checklist
      .filter((c) => c.id !== "issue_done_when")
      .map((c) =>
        c.id === "linked_issue"
          ? { ...c, status: "fail" as const, evidence: "No 'Fixes #N' in the description", fix: "Add Fixes #N to the description." }
          : c,
      ),
    line_comments: [],
    questions_a_maintainer_would_ask: [],
  },
};

const samples: [string, PrCommentInput, string][] = [
  ["comment-ready.md", base, "ready"],
  ["comment-needs-changes.md", needs, "needs_changes"],
  ["comment-no-issue.md", noIssue, "no_issue"],
];

const outDir = process.argv[2];
if (outDir) mkdirSync(outDir, { recursive: true });

const SLOP = /\b(delve|seamless|leverage|robust|comprehensive|elevate|unlock|tapestry|crucial|great job|awesome)\b/i;
const EMOJI = /\p{Extended_Pictographic}/gu;

for (const [file, input, want] of samples) {
  const md = formatPrComment(input);
  expect(`${file} verdict`, prCommentVerdict(input) === want);
  expect(`${file} marker first`, md.startsWith(PR_COMMENT_MARKER));
  expect(`${file} one marker`, md.split(PR_COMMENT_MARKER).length === 2);
  expect(`${file} at most one emoji`, (md.match(EMOJI) ?? []).length <= 1);
  expect(`${file} no slop words`, !SLOP.test(md));
  expect(`${file} has table`, md.includes("| Check | Result | Notes |"));
  expect(`${file} has details`, md.includes("<details>") && md.includes("</details>"));
  expect(`${file} review link`, md.includes(`/review?pr=${encodeURIComponent(input.prUrl)}`));
  expect(`${file} recheck hint`, md.includes("/firstpr recheck"));
  expect(`${file} opt-out hint`, md.includes("enabled: false"));
  expect(`${file} signature`, md.includes("FirstPRbot"));
  expect(`${file} no raw @mention`, !/(^|[^\u200b])@everyone/.test(md));
  const focus = md.split("#### What a maintainer should look at")[1].split("####")[0];
  const items = focus.split("\n").filter((l) => l.startsWith("- "));
  expect(`${file} 1-3 maintainer items`, items.length >= 1 && items.length <= 3);
  const steps = md.split("#### For the contributor")[1].split("<details>")[0];
  const n = steps.split("\n").filter((l) => /^\d\. /.test(l)).length;
  expect(`${file} 1-3 contributor steps`, n >= 1 && n <= 3);
  // Table rows never break on a stray pipe.
  for (const row of md.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| ---"))) {
    const cols = row.replace(/\\\|/g, "").split("|").length - 2;
    expect(`${file} row cols: ${row.slice(0, 40)}`, cols === 3 || cols === 4);
  }
  if (outDir) writeFileSync(join(outDir, file), md + "\n");
}

const needsMd = formatPrComment(needs);
const proseLines = needsMd.split("\n").filter((l) => !l.startsWith("| "));
expect("needs: no escaped pipe in prose", !proseLines.some((l) => l.includes("\\|")));
expect("needs: pipe read as comma", needsMd.includes("renames formatDate, which breaks existing imports."));
expect("needs: no rule labels in steps", !/^\d\. (Tests touched|Forbidden files|Scope|CONTRIBUTING rules):/m.test(needsMd));
expect("needs: revert step", needsMd.includes("Revert package-lock.json."));
const focusLines = needsMd.split("#### What a maintainer should look at")[1].split("####")[0].split("\n").filter((l) => l.startsWith("- "));
expect("needs: maintainer bullets end with a period", focusLines.every((l) => l.endsWith(".")));
expect("needs: maintainer bullets linked", focusLines.every((l) => l.startsWith("- [`")));
expect("needs: unlinked note gets a diff anchor", needsMd.includes(`(${diffUrl(needs.prUrl, "src/date/index.ts", 3)})`));
expect("needs: no test claim without tests", !/\btests?\b.*covers|covers.*\btests?\b/i.test(needsMd));
// A model note that claims tests is trimmed when no test file changed.
const claims: PrCommentInput = {
  ...needs,
  review: {
    ...needs.review,
    checklist: needs.review.checklist.map((c) =>
      c.id === "issue_done_when" ? { ...c, evidence: "formatDate now takes the user's timezone and the test covers IST and PST" } : c,
    ),
  },
};
const claimsMd = formatPrComment(claims);
expect("claims: test clause dropped", !claimsMd.includes("IST and PST") && claimsMd.includes("formatDate now takes the user's timezone"));
expect("claims: kept when tests changed", formatPrComment({ ...claims, files: base.files, review: { ...claims.review, checklist: claims.review.checklist.map((c) => (c.id === "tests_touched" ? { ...c, status: "pass" as const } : c)) } }).includes("IST and PST"));
expect("ready: plain disclaimer", formatPrComment(base).includes("They can be wrong, so check them yourself."));

expect("needs: blocker first", formatPrComment(needs).includes("[`src/date/format.ts:48`]"));
expect("needs: nit skipped", !formatPrComment(needs).split("<details>")[0].includes("Typo"));
expect("needs: ask to be assigned", formatPrComment(needs).includes("ask to be assigned"));
expect("ready: thanks first-timer", formatPrComment(base).includes("Thanks for your first PR"));
expect(
  "no linked issue required off",
  prCommentVerdict({ ...noIssue, requireLinkedIssue: false }) === "ready",
);

// Linked issue parsing
const li = (body: string) => parseLinkedIssueNumbers(body, "acme", "widgets").join(",");
expect("fixes #12", li("Fixes #12") === "12");
expect("closes: #3 and resolves #4", li("closes: #3 and resolves #4") === "3,4");
expect("same repo ref", li("Fixes acme/widgets#9") === "9");
expect("other repo ignored", li("Fixes other/repo#9") === "");
expect("issue url", li("Resolves https://github.com/acme/widgets/issues/77") === "77");
expect("mention only", li("See #5") === "");

// Config parsing
const cfg = parseBotConfig(`# FirstPRbot
enabled: true
minimize_old: no
require_linked_issue: false
labels:
  first_timer: "first-timer"
  needs_issue: needs-issue # comment
`);
expect("cfg enabled", cfg.enabled === true);
expect("cfg minimize", cfg.minimizeOld === false);
expect("cfg require", cfg.requireLinkedIssue === false);
expect("cfg labels", cfg.labels.firstTimer === "first-timer" && cfg.labels.needsIssue === "needs-issue");
expect("cfg off", parseBotConfig("enabled: false").enabled === false);
expect("cfg defaults", parseBotConfig(null).requireLinkedIssue && !parseBotConfig("").labels.firstTimer);
expect("cfg junk", parseBotConfig("::: not yaml\n- x").enabled === true);

// Reliability line: only real, non-zero data.
expect("rel none", formatReliabilityLine(null) === null && formatReliabilityLine(undefined) === null);
expect("rel zero", formatReliabilityLine({ days: 30, runs: 0, ok: 0, prs: 0 }) === null);
expect("rel no prs", formatReliabilityLine({ days: 30, runs: 2, ok: 2, prs: 0 }) === null);
expect(
  "rel text",
  formatReliabilityLine({ days: 30, runs: 8, ok: 7, prs: 3 }) ===
    "FirstPRbot on this repo, last 30 days: 3 PRs handled, 88% of 8 runs finished without an error.",
);
expect("rel singular", formatReliabilityLine({ days: 30, runs: 1, ok: 1, prs: 1 })?.includes("1 PR handled, 100% of 1 run") === true);
{
  const plain: PrCommentInput = { ...base, reliability: null };
  expect("rel absent in comment", !formatPrComment(plain).includes("last 30 days"));
  const withData: PrCommentInput = { ...plain, reliability: { days: 30, runs: 4, ok: 4, prs: 2 } };
  const md = formatPrComment(withData);
  expect("rel in comment", md.includes("<sub>FirstPRbot on this repo, last 30 days: 2 PRs handled, 100% of 4 runs"));
  expect("rel one comment marker", md.split(PR_COMMENT_MARKER).length === 2);
}

// Linked issue row follows GitHub's closing references, with a reason when none.
{
  const note = "The description mentions #7, but GitHub hasn't linked it as an issue this PR closes";
  const unlinked: PrCommentInput = { ...base, linkedIssue: null, linkedIssueNumber: null, linkedIssueNote: note, requireLinkedIssue: true };
  const md = formatPrComment(unlinked);
  expect("note in linked row", md.includes(`| Linked issue | No | ${note} |`) || md.includes(note));
  expect("note in headline", md.includes(`${note}.`));
  expect("no fixes hint when note", !md.includes("No `Fixes #N` in the description"));
}

if (failed) {
  console.error(`${failed} bot comment check(s) failed`);
  process.exit(1);
}
console.log(`bot comment ok (3 samples${outDir ? ` written to ${outDir}` : ""})`);
