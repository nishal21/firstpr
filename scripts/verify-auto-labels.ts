// Run with: node scripts/verify-auto-labels.ts
// Unit checks for FirstPRbot's fact-based labels (pure rules, no network).
import { parseBotConfig } from "../lib/bot-config.ts";
import {
  AUTO_LABEL_GROUPS,
  AUTO_LABELS,
  bodyMentionsClosing,
  computeAutoLabels,
  formatLabelsBlock,
  LABELS_BLOCK_END,
  LABELS_BLOCK_START,
  planLabelSync,
  replaceLabelsBlock,
  sizeBucket,
  type AutoLabelGroup,
  type LabelFacts,
  type LabelFile,
} from "../lib/auto-labels.ts";
import { formatPrComment } from "../lib/webhook-format.ts";

let failed = 0;
let ran = 0;
function expect(name: string, ok: boolean, detail?: unknown) {
  ran++;
  if (!ok) {
    failed++;
    console.error(`FAIL ${name}`, detail ?? "");
  }
}

const ALL = new Set<AutoLabelGroup>(AUTO_LABEL_GROUPS);
const SHA = "abc1234def5678900000000000000000000000000";
const f = (filename: string, additions = 1, deletions = 0, previousFilename: string | null = null): LabelFile => ({
  filename,
  additions,
  deletions,
  previousFilename,
});

function facts(over: Partial<LabelFacts> = {}): LabelFacts {
  const files = over.files ?? [f("src/a.ts", 20, 2)];
  return {
    owner: "acme",
    repo: "widgets",
    number: 7,
    prUrl: "https://github.com/acme/widgets/pull/7",
    headSha: SHA,
    author: "sam",
    authorAssociation: "CONTRIBUTOR",
    body: "Small fix",
    changedFiles: files.length,
    closing: { ok: true, baseRef: "main", defaultBranch: "main", issues: [], totalCount: 0 },
    checks: {
      ok: true,
      runs: [
        { name: "lint", status: "completed", conclusion: "success" },
        { name: "test", status: "completed", conclusion: "success" },
      ],
      statuses: [],
      suites: [{ app: "github-actions", status: "completed", conclusion: "success", runCount: 2 }],
    },
    ...over,
    files,
  };
}

const names = (fx: LabelFacts, groups: Set<AutoLabelGroup> = ALL) =>
  computeAutoLabels(fx, groups).labels.map((l) => l.def.name);
const notes = (fx: LabelFacts, groups: Set<AutoLabelGroup> = ALL) =>
  computeAutoLabels(fx, groups).skipped.map((s) => s.note);
const has = (fx: LabelFacts, label: string) => names(fx).includes(label);
const evidence = (fx: LabelFacts, label: string) =>
  computeAutoLabels(fx, ALL).labels.find((l) => l.def.name === label)?.evidence ?? "";

// --- size thresholds -------------------------------------------------------
expect("bucket 0", sizeBucket(0) === "XS");
expect("bucket 9", sizeBucket(9) === "XS");
expect("bucket 10", sizeBucket(10) === "S");
expect("bucket 29", sizeBucket(29) === "S");
expect("bucket 30", sizeBucket(30) === "M");
expect("bucket 99", sizeBucket(99) === "M");
expect("bucket 100", sizeBucket(100) === "L");
expect("bucket 499", sizeBucket(499) === "L");
expect("bucket 500", sizeBucket(500) === "XL");

// 22 lines in src + 3000 in package-lock: S, lockfile named in evidence.
const withLock = facts({ files: [f("src/a.ts", 20, 2), f("package-lock.json", 2500, 500)] });
expect("size excludes lockfile", has(withLock, AUTO_LABELS.sizeS.name), names(withLock));
expect("size evidence", /22 lines changed \(\+20 −2\) in 1 file, not counting `package-lock.json`/.test(evidence(withLock, AUTO_LABELS.sizeS.name)), evidence(withLock, AUTO_LABELS.sizeS.name));
const noExcl = evidence(facts(), AUTO_LABELS.sizeS.name);
expect("size evidence no exclusions", noExcl.includes("no lockfiles or generated files"), noExcl);
const gen = facts({ files: [f("dist/app.min.js", 900, 900), f("vendor/x/y.go", 400), f("api/x.pb.go", 300), f("src/__generated__/t.ts", 300), f("lib/a.ts", 3)] });
expect("size excludes vendored/generated", has(gen, AUTO_LABELS.sizeXS.name), names(gen));
expect("size 9 is XS", has(facts({ files: [f("src/a.ts", 5, 4)] }), AUTO_LABELS.sizeXS.name));
expect("size 10 is S", has(facts({ files: [f("src/a.ts", 5, 5)] }), AUTO_LABELS.sizeS.name));
expect("size 99 is M", has(facts({ files: [f("src/a.ts", 50, 49)] }), AUTO_LABELS.sizeM.name));
expect("size 100 is L", has(facts({ files: [f("src/a.ts", 50, 25), f("src/b.ts", 25, 0)] }), AUTO_LABELS.sizeL.name));
expect("size 499 is L", has(facts({ files: [f("src/a.ts", 499, 0)] }), AUTO_LABELS.sizeL.name));
expect("size XL", has(facts({ files: [f("src/a.ts", 400, 100)] }), AUTO_LABELS.sizeXL.name));

// Lockfile-only: no size label (nothing countable), deps only applies.
const lockOnly = facts({ files: [f("yarn.lock", 300, 200)] });
expect("lockfile-only no size", !names(lockOnly).some((n) => n.includes("size")), names(lockOnly));
expect("lockfile-only size note", notes(lockOnly).some((n) => n.startsWith("No size label: every changed file is a lockfile")), notes(lockOnly));
expect("lockfile-only deps", has(lockOnly, AUTO_LABELS.deps.name));

// Truncated file list: no size, no area.
const trunc = facts({ files: [f("README.md", 1)], changedFiles: 3001 });
expect("truncated no size", !names(trunc).some((n) => n.includes("size")));
expect("truncated no area", !has(trunc, AUTO_LABELS.docs.name));
expect("truncated note", notes(trunc).some((n) => n.includes("1 of 3001")), notes(trunc));
const empty = facts({ files: [], changedFiles: 0 });
expect("no files no size", !names(empty).some((n) => n.includes("size")) && !has(empty, AUTO_LABELS.docs.name));

// Binary-only change: 0 lines, noted.
const bin = facts({ files: [f("public/logo.png", 0, 0)] });
expect("binary XS", has(bin, AUTO_LABELS.sizeXS.name));
expect("binary noted", evidence(bin, AUTO_LABELS.sizeXS.name).includes("1 file with no line changes"));

// --- area ------------------------------------------------------------------
const docsOnly = facts({ files: [f("README.md"), f("docs/setup.txt"), f("guide/intro.mdx"), f("CHANGELOG.rst")] });
expect("docs-only", has(docsOnly, AUTO_LABELS.docs.name), names(docsOnly));
expect("docs evidence", evidence(docsOnly, AUTO_LABELS.docs.name).startsWith("all 4 changed files are docs"));
expect("src/docs not docs", !has(facts({ files: [f("src/docs/model.ts")] }), AUTO_LABELS.docs.name));
expect("docs + code mixed", !has(facts({ files: [f("README.md"), f("src/a.ts")] }), AUTO_LABELS.docs.name));
expect("rename into docs from code", !has(facts({ files: [f("docs/a.md", 0, 0, "src/a.ts")] }), AUTO_LABELS.docs.name));
expect("rename within docs", has(facts({ files: [f("docs/b.md", 0, 0, "docs/a.md")] }), AUTO_LABELS.docs.name));

const testsOnly = facts({ files: [f("src/a.test.ts"), f("tests/test_api.py"), f("pkg/x_test.go"), f("spec/user_spec.rb"), f("tests/conftest.py"), f("src/__snapshots__/a.test.ts.snap")] });
expect("tests-only", has(testsOnly, AUTO_LABELS.tests.name), names(testsOnly));
expect("test+src mixed", !has(facts({ files: [f("src/a.test.ts"), f("src/a.ts")] }), AUTO_LABELS.tests.name));
expect("spec dir alone not tests", !has(facts({ files: [f("spec/openapi.yaml")] }), AUTO_LABELS.tests.name));
expect("fixtures alone not tests", !has(facts({ files: [f("fixtures/data.json")] }), AUTO_LABELS.tests.name));
expect("latest.ts not test", !has(facts({ files: [f("src/latest.ts")] }), AUTO_LABELS.tests.name));
expect("contest dir not test", !has(facts({ files: [f("contest/a.ts")] }), AUTO_LABELS.tests.name));
expect("tests/README is docs not tests", has(facts({ files: [f("tests/README.md")] }), AUTO_LABELS.docs.name) && !has(facts({ files: [f("tests/README.md")] }), AUTO_LABELS.tests.name));

const ciOnly = facts({ files: [f(".github/workflows/ci.yml"), f(".github/workflows/release.yaml")] });
expect("ci-only", has(ciOnly, AUTO_LABELS.ci.name));
expect("ci + action not ci", !has(facts({ files: [f(".github/workflows/ci.yml"), f(".github/actions/x/action.yml")] }), AUTO_LABELS.ci.name));
expect("ci + src not ci", !has(facts({ files: [f(".github/workflows/ci.yml"), f("src/a.ts")] }), AUTO_LABELS.ci.name));

expect("deps manifest+lock", has(facts({ files: [f("package.json"), f("pnpm-lock.yaml", 40, 10)] }), AUTO_LABELS.deps.name));
expect("deps monorepo", has(facts({ files: [f("apps/web/package.json"), f("Cargo.lock"), f("crates/x/Cargo.toml"), f("go.sum"), f("go.mod")] }), AUTO_LABELS.deps.name));
expect("package.json alone not deps", !has(facts({ files: [f("package.json")] }), AUTO_LABELS.deps.name));
expect("requirements alone not deps", !has(facts({ files: [f("requirements.txt")] }), AUTO_LABELS.deps.name));
expect("deps + src not deps", !has(facts({ files: [f("package.json"), f("package-lock.json"), f("src/a.ts")] }), AUTO_LABELS.deps.name));
const mixed = facts({ files: [f("README.md"), f("src/a.test.ts"), f(".github/workflows/ci.yml"), f("yarn.lock")] });
expect("mixed gets no area", ![AUTO_LABELS.docs, AUTO_LABELS.tests, AUTO_LABELS.ci, AUTO_LABELS.deps].some((d) => has(mixed, d.name)), names(mixed));
expect("one area at most", names(docsOnly).filter((n) => /only$/.test(n)).length === 1);

// --- linked issue -----------------------------------------------------------
const noLink = facts();
expect("no linked issue", has(noLink, AUTO_LABELS.noLinked.name));
expect("no linked evidence", evidence(noLink, AUTO_LABELS.noLinked.name).startsWith("GitHub shows no issue"));
const linked = facts({
  closing: { ok: true, baseRef: "main", defaultBranch: "main", totalCount: 2, issues: [
    { number: 12, url: "https://github.com/acme/widgets/issues/12", repo: "acme/widgets" },
    { number: 3, url: "https://github.com/acme/core/issues/3", repo: "acme/core" },
  ] },
});
expect("linked", has(linked, AUTO_LABELS.linked.name) && !has(linked, AUTO_LABELS.noLinked.name));
expect("linked evidence links", evidence(linked, AUTO_LABELS.linked.name) === "GitHub will close [#12](https://github.com/acme/widgets/issues/12), [acme/core#3](https://github.com/acme/core/issues/3) when this PR merges", evidence(linked, AUTO_LABELS.linked.name));
const keywordNoLink = facts({ body: "This fixes #99 I think" });
expect("keyword but no GitHub link: no label", !has(keywordNoLink, AUTO_LABELS.noLinked.name) && !has(keywordNoLink, AUTO_LABELS.linked.name));
expect("keyword note", notes(keywordNoLink).some((n) => n.includes("closing keyword")));
expect("keyword in code ignored", has(facts({ body: "Run `fixes #1` script\n```\ncloses #2\n```" }), AUTO_LABELS.noLinked.name));
expect("mention regex url", bodyMentionsClosing("Resolves https://github.com/a/b/issues/4"));
expect("mention regex cross-repo", bodyMentionsClosing("closes other/repo#4"));
expect("mention regex plain ref", !bodyMentionsClosing("see #4, related to #5"));
const nonDefault = facts({ closing: { ok: true, baseRef: "develop", defaultBranch: "main", issues: [], totalCount: 0 } });
expect("non-default base: no label", !has(nonDefault, AUTO_LABELS.noLinked.name));
expect("non-default note", notes(nonDefault).some((n) => n.includes("`develop`")));
const gqlFail = facts({ closing: { ok: false } });
expect("closing read failed: no label", !names(gqlFail).some((n) => n.includes("linked")));
expect("hidden linked issue: no label", !names(facts({ closing: { ok: true, baseRef: "main", defaultBranch: "main", issues: [], totalCount: 1 } })).some((n) => n.includes("linked")));

// --- checks ----------------------------------------------------------------
const passing = facts();
expect("passing", has(passing, AUTO_LABELS.checksPassing.name));
expect("passing evidence", evidence(passing, AUTO_LABELS.checksPassing.name) === "2 of 2 checks green on [`abc1234`](https://github.com/acme/widgets/pull/7/checks)", evidence(passing, AUTO_LABELS.checksPassing.name));
const pending = facts({ checks: { ok: true, runs: [
  { name: "lint", status: "completed", conclusion: "failure" },
  { name: "test", status: "in_progress", conclusion: null },
], statuses: [{ context: "vercel", state: "success" }], suites: [] } });
expect("pending: no checks label even with a failure", !names(pending).some((n) => n.includes("checks")), names(pending));
expect("pending note", notes(pending).includes("No checks label yet: 1 of 3 checks still running on `abc1234`."), notes(pending));
const pendingStatus = facts({ checks: { ok: true, runs: [], statuses: [{ context: "ci/circle", state: "pending" }], suites: [] } });
expect("pending status", !names(pendingStatus).some((n) => n.includes("checks")));
const waiting = facts({ checks: { ok: true, runs: [{ name: "lint", status: "completed", conclusion: "success" }], statuses: [], suites: [
  { app: "github-actions", status: "completed", conclusion: "action_required", runCount: 0 },
] } });
expect("approval-waiting workflow: no label", !names(waiting).some((n) => n.includes("checks")));
expect("waiting note", notes(waiting).some((n) => n.includes("waiting to start or for approval")), notes(waiting));
const idleOtherApp = facts({ checks: { ok: true, runs: [{ name: "lint", status: "completed", conclusion: "success" }], statuses: [], suites: [
  { app: "some-app", status: "queued", conclusion: null, runCount: 0 },
] } });
expect("other app empty suite ignored", has(idleOtherApp, AUTO_LABELS.checksPassing.name));
const failing = facts({ checks: { ok: true, runs: [
  { name: "lint", status: "completed", conclusion: "success" },
  { name: "test (node 20)", status: "completed", conclusion: "timed_out" },
], statuses: [{ context: "ci/legacy", state: "error" }], suites: [] } });
expect("failing", has(failing, AUTO_LABELS.checksFailing.name));
expect("failing evidence", evidence(failing, AUTO_LABELS.checksFailing.name) === "2 of 3 checks failed on [`abc1234`](https://github.com/acme/widgets/pull/7/checks): `test (node 20)`, `ci/legacy`", evidence(failing, AUTO_LABELS.checksFailing.name));
const cancelled = facts({ checks: { ok: true, runs: [
  { name: "lint", status: "completed", conclusion: "success" },
  { name: "deploy", status: "completed", conclusion: "cancelled" },
], statuses: [], suites: [] } });
expect("cancelled: no label", !names(cancelled).some((n) => n.includes("checks")));
expect("cancelled note", notes(cancelled).some((n) => n.includes("`deploy (cancelled)`")), notes(cancelled));
const cancelledAndFailed = facts({ checks: { ok: true, runs: [
  { name: "a", status: "completed", conclusion: "cancelled" },
  { name: "b", status: "completed", conclusion: "failure" },
], statuses: [], suites: [] } });
expect("definite failure beats cancelled", has(cancelledAndFailed, AUTO_LABELS.checksFailing.name));
const skipped = facts({ checks: { ok: true, runs: [
  { name: "a", status: "completed", conclusion: "success" },
  { name: "b", status: "completed", conclusion: "skipped" },
], statuses: [{ context: "vercel", state: "success" }], suites: [] } });
expect("skipped counts as green", evidence(skipped, AUTO_LABELS.checksPassing.name).includes("3 of 3 checks green") && evidence(skipped, AUTO_LABELS.checksPassing.name).includes("1 skipped or neutral"));
const none = facts({ checks: { ok: true, runs: [], statuses: [], suites: [] } });
expect("zero checks: no label", !names(none).some((n) => n.includes("checks")));
expect("zero checks note", notes(none).includes("No checks label: no checks have reported on `abc1234`."));
const noAccess = facts({ checks: { ok: false, reason: "no_access" } });
expect("no access: no label", !names(noAccess).some((n) => n.includes("checks")) && notes(noAccess).some((n) => n.includes("can't read check runs")));

// --- first-time -------------------------------------------------------------
expect("first-time contributor", has(facts({ authorAssociation: "FIRST_TIME_CONTRIBUTOR" }), AUTO_LABELS.firstTime.name));
expect("first timer", has(facts({ authorAssociation: "FIRST_TIMER" }), AUTO_LABELS.firstTime.name));
expect("NONE is not first-time", !has(facts({ authorAssociation: "NONE" }), AUTO_LABELS.firstTime.name));
expect("contributor not first-time", !has(facts({ authorAssociation: "CONTRIBUTOR" }), AUTO_LABELS.firstTime.name));
expect("missing association", !has(facts({ authorAssociation: null }), AUTO_LABELS.firstTime.name));
expect("first-time evidence", evidence(facts({ authorAssociation: "FIRST_TIME_CONTRIBUTOR" }), AUTO_LABELS.firstTime.name) === "GitHub marks `@sam` as a first-time contributor to this repo");

// --- groups / config --------------------------------------------------------
expect("groups filter", names(facts({ authorAssociation: "FIRST_TIME_CONTRIBUTOR" }), new Set<AutoLabelGroup>(["first-time"])).join() === AUTO_LABELS.firstTime.name);
expect("no groups no labels", computeAutoLabels(facts(), new Set()).labels.length === 0);
expect("cfg default on", parseBotConfig(null).autoLabels.size === AUTO_LABEL_GROUPS.length);
expect("cfg false", parseBotConfig("auto_labels: false").autoLabels.size === 0);
expect("cfg true", parseBotConfig("auto_labels: true").autoLabels.size === 5);
const picked = parseBotConfig("auto_labels: size, checks, linked_issue, first_time  # comment").autoLabels;
expect("cfg list", picked.size === 4 && picked.has("size") && picked.has("checks") && picked.has("linked-issue") && picked.has("first-time"), [...picked]);
expect("cfg bracket list", [...parseBotConfig("auto_labels: [area, \"size\"]").autoLabels].sort().join() === "area,size");
expect("cfg unknown only = off", parseBotConfig("auto_labels: colors").autoLabels.size === 0);
expect("cfg empty keeps default", parseBotConfig("auto_labels:").autoLabels.size === 5);
const both = parseBotConfig("auto_labels: size\nlabels:\n  first_timer: first-timer\n");
expect("cfg with legacy labels", both.autoLabels.size === 1 && both.labels.firstTimer === "first-timer");

// --- sync plan --------------------------------------------------------------
const S = AUTO_LABELS.sizeS.name;
const M = AUTO_LABELS.sizeM.name;
const P = AUTO_LABELS.checksPassing.name;
const F = AUTO_LABELS.checksFailing.name;
const p1 = planLabelSync({ current: ["bug"], desired: [S, P], events: [] });
expect("plan add fresh", p1.add.join() === [S, P].join() && p1.remove.length === 0);
const p2 = planLabelSync({ current: [S, P, "bug"], desired: [M, F], events: [
  { event: "labeled", label: S, byBot: true },
  { event: "labeled", label: P, byBot: true },
] });
expect("plan swap bot labels", p2.add.join() === [M, F].join() && p2.remove.join() === [S, P].join(), p2);
const p3 = planLabelSync({ current: [P], desired: [], events: [{ event: "labeled", label: P, byBot: false }] });
expect("maintainer-added kept", p3.remove.length === 0 && p3.heldByMaintainer.join() === P, p3);
const p4 = planLabelSync({ current: [], desired: [F], events: [
  { event: "labeled", label: F, byBot: true },
  { event: "unlabeled", label: F, byBot: false },
] });
expect("maintainer-removed not re-added", p4.add.length === 0 && p4.heldByMaintainer.join() === F, p4);
const p5 = planLabelSync({ current: [F], desired: [], events: [] });
expect("unknown origin not removed", p5.remove.length === 0);
const p6 = planLabelSync({ current: ["bug", "good first issue"], desired: [], events: [] });
expect("never touches other labels", p6.add.length === 0 && p6.remove.length === 0);
const p7 = planLabelSync({ current: [P.toUpperCase()], desired: [P], events: [{ event: "labeled", label: P, byBot: true }] });
expect("case-insensitive no-op", p7.add.length === 0 && p7.remove.length === 0);
const p8 = planLabelSync({ current: [], desired: [F], events: [
  { event: "unlabeled", label: F, byBot: false },
  { event: "labeled", label: F, byBot: true },
  { event: "unlabeled", label: F, byBot: true },
] });
expect("last event wins", p8.add.join() === F);

// --- comment block -----------------------------------------------------------
const r = computeAutoLabels(withLock, ALL);
const block = formatLabelsBlock(r, { status: "applied", plan: { add: [], remove: [], heldByMaintainer: [] } });
expect("block markers", block[0] === LABELS_BLOCK_START && block[block.length - 1] === LABELS_BLOCK_END);
expect("block line per label", r.labels.every((l) => block.some((b) => b.startsWith(`- \`${l.def.name}\`: `))));
expect("block lists every label", block.filter((b) => b.startsWith("- `firstpr/")).length === r.labels.length);
const pendingBlock = formatLabelsBlock(computeAutoLabels(pending, ALL), { status: "applied", plan: { add: [], remove: [], heldByMaintainer: [] } });
expect("block skip note", pendingBlock.includes("- No checks label yet: 1 of 3 checks still running on `abc1234`."), pendingBlock);
const failedBlock = formatLabelsBlock(r, { status: "failed" });
expect("block failed note", failedBlock.some((b) => b.includes("couldn't update labels")));
const heldBlock = formatLabelsBlock(computeAutoLabels(facts(), ALL), { status: "applied", plan: { add: [], remove: [], heldByMaintainer: [P, AUTO_LABELS.firstTime.name] } });
expect("block held removed", heldBlock.some((b) => b.startsWith(`- \`${P}\`:`) && b.includes("a maintainer removed this label")), heldBlock);
expect("block held added", heldBlock.some((b) => b === `- \`${AUTO_LABELS.firstTime.name}\`: added by a maintainer, left as is`), heldBlock);
const emptyBlock = formatLabelsBlock({ labels: [], skipped: [] }, { status: "applied", plan: { add: [], remove: [], heldByMaintainer: [] } });
expect("empty block keeps markers", emptyBlock.join() === [LABELS_BLOCK_START, LABELS_BLOCK_END].join());
const evil = formatLabelsBlock(computeAutoLabels(facts({ files: [f("docs/x-->`<b>.md")] }), ALL), { status: "applied", plan: { add: [], remove: [], heldByMaintainer: [] } });
expect("block can't close the marker", evil.filter((b) => b.includes("-->")).length === 2, evil);

const body = `top\n${block.join("\n")}\nbottom`;
const replaced = replaceLabelsBlock(body, pendingBlock);
expect("replace block", replaced === `top\n${pendingBlock.join("\n")}\nbottom`);
expect("replace no markers", replaceLabelsBlock("no block here", block) === null);

const comment = formatPrComment({
  owner: "acme", repo: "widgets", number: 7, prUrl: "https://github.com/acme/widgets/pull/7", headSha: SHA,
  author: "sam", firstTimeContributor: false, additions: 20, deletions: 2, changedFiles: 1,
  linkedIssueNumber: null, linkedIssue: null, files: [{ filename: "src/a.ts", additions: 20, deletions: 2 }],
  requireLinkedIssue: true, labelsBlock: block,
  review: { score: 70, checklist: [], line_comments: [], questions_a_maintainer_would_ask: [] },
});
expect("comment has block", comment.includes(LABELS_BLOCK_START) && comment.includes("#### Labels"));
expect("comment block before maintainer section", comment.indexOf("#### Labels") < comment.indexOf("#### What a maintainer"));
expect("comment refreshable", replaceLabelsBlock(comment, pendingBlock)?.includes("still running") === true);

if (failed) {
  console.error(`${failed} of ${ran} auto-label check(s) failed`);
  process.exit(1);
}
console.log(`auto labels ok (${ran} checks)`);
