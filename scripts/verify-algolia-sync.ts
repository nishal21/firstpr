/**
 * Offline checks for the issue index rules: which issues stay, how change cursors move,
 * and the monthly Algolia ops estimate.
 * npx tsx scripts/verify-algolia-sync.ts
 */
import {
  FULL_PASS_EVERY_S,
  MAX_COOLDOWN_WAIT_MS,
  OPEN_ISSUE_QUERY,
  STALE_ISSUE_QUERY,
  SEARCH_LAG_S,
  continueAfterLimit,
  cooldownWaitMs,
  fullPassDue,
  fullPassPageDone,
  issueVerdict,
  labelsQualify,
  linkedInOrGroup,
  monthlyOpsEstimate,
  nextUpdatedCursor,
  type IssueFact,
} from "../lib/algolia-sync-plan.ts";

let failed = 0;
function check(name: string, ok: boolean): void {
  if (!ok) {
    failed += 1;
    console.log("FAIL", name);
  }
}

const repo = { isPrivate: false, isArchived: false, stars: 10, language: "Go" };
const issue = { state: "OPEN", locked: false, assignees: 0, labels: ["Good First Issue"], openLinkedPrs: 0 };
const good: IssueFact = { repo, issue };

check("open labelled issue stays", issueVerdict(good).keep);
const cases: [string, IssueFact, string][] = [
  ["deleted repo", { repo: null, issue: null }, "repo_gone"],
  ["private repo", { repo: { ...repo, isPrivate: true }, issue }, "repo_private"],
  ["archived repo", { repo: { ...repo, isArchived: true }, issue }, "repo_archived"],
  ["deleted issue", { repo, issue: null }, "issue_gone"],
  ["closed", { repo, issue: { ...issue, state: "CLOSED" } }, "closed"],
  ["locked", { repo, issue: { ...issue, locked: true } }, "locked"],
  ["assigned", { repo, issue: { ...issue, assignees: 1 } }, "assigned"],
  ["open PR", { repo, issue: { ...issue, openLinkedPrs: 1 } }, "linked_pr"],
  ["label removed", { repo, issue: { ...issue, labels: ["bug"] } }, "labels"],
];
for (const [name, fact, reason] of cases) {
  const verdict = issueVerdict(fact);
  check(name, !verdict.keep && verdict.reason === reason);
}
check("help wanted qualifies", labelsQualify(["help wanted"]));
check("near-miss label does not", !labelsQualify(["good-first-issue-ish"]));

check("first pass due", fullPassDue(null, 1_000));
check("pass not due after a day", !fullPassDue(1_000, 1_000 + 86_400));
check("pass due after a month", fullPassDue(1_000, 1_000 + FULL_PASS_EVERY_S));

const now = 2_000_000_000;
const full = nextUpdatedCursor(100, 500, true, now);
check("full page moves to newest second", full.since === 500 && !full.caughtUp);
const same = nextUpdatedCursor(500, 500, true, now);
check("full page of one second steps past it", same.since === 501);
const short = nextUpdatedCursor(100, now - 10, false, now);
check("short page parks behind search lag", short.caughtUp && short.since === now - SEARCH_LAG_S);
const empty = nextUpdatedCursor(100, null, false, now);
check("empty page keeps cursor", empty.caughtUp && empty.since === 100);
const old = nextUpdatedCursor(100, 400, false, now);
check("short old page moves to its newest", old.since === 400);

const ops = monthlyOpsEstimate({ records: 19_000, changedPerDay: 1_500, removedPerDay: 800 });
check("ops estimate under 2M", ops.total < 2_000_000);
console.log("ops estimate", JSON.stringify(ops));

// Rate-limit hand-off: a run stopped by a secondary limit keeps the chain going.
check("no cool-down when none stored", cooldownWaitMs(0, Date.now()) === 0);
check("no cool-down once it has passed", cooldownWaitMs(100, 200_000) === 0);
check("waits out the rest of a cool-down", cooldownWaitMs(200, 150_000) === 50_000);
check("cool-down wait is capped", cooldownWaitMs(10_000, 0) === MAX_COOLDOWN_WAIT_MS);
check("cool-down ignores bad input", cooldownWaitMs(Number.NaN, 0) === 0);
check("secondary limit after progress continues", continueAfterLimit(600, 65_000));
check("limit with nothing saved ends the chain", !continueAfterLimit(0, 65_000));
check("limit with a long reset ends the chain", !continueAfterLimit(600, 30 * 60_000));
check("limit at the cap still continues", continueAfterLimit(1, MAX_COOLDOWN_WAIT_MS));
check("last short page ends the pass", fullPassPageDone({ hits: 40, total: 40, incomplete: false }));
check("short page with more left keeps the pass open", !fullPassPageDone({ hits: 12, total: 9800, incomplete: false }));
check("full page keeps the pass open", !fullPassPageDone({ hits: 100, total: 100, incomplete: false }));
check("incomplete page keeps the pass open", !fullPassPageDone({ hits: 30, total: 30, incomplete: true }));
check("old stale query is caught", linkedInOrGroup('is:issue (is:closed OR assignee:* OR is:locked OR linked:pr)'));
check("stale query has no linked: in an OR group", !linkedInOrGroup(STALE_ISSUE_QUERY));
check("open query has no linked: in an OR group", !linkedInOrGroup(OPEN_ISSUE_QUERY));
check("stale query finds closed issues", STALE_ISSUE_QUERY.includes("is:closed"));
check("open query keeps PR-linked issues out", OPEN_ISSUE_QUERY.includes("-linked:pr"));
check("empty page with nothing left ends the pass", fullPassPageDone({ hits: 0, total: 0, incomplete: false }));

if (failed) {
  console.log(`${failed} algolia sync checks failed`);
  process.exit(1);
}
console.log(`algolia sync ok (${cases.length + 32} checks)`);
