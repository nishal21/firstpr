/**
 * Offline checks for F3: next-issue suggestions after a first-timer's PR is merged.
 * npx tsx scripts/verify-next-issues.ts
 */
import { parseBotConfig } from "../lib/bot-config.ts";
import {
  NEXT_ISSUES_END,
  NEXT_ISSUES_START,
  extractNextIssuesBlock,
  formatNextIssuesBlock,
  hasNextIssuesBlock,
  insertNextIssuesBlock,
  languageFilter,
  pickSuggestions,
  safeTitle,
  summarySaysFirstTimer,
  type IndexHit,
} from "../lib/next-issues.ts";

let checks = 0;
let failed = 0;
function check(name: string, ok: boolean): void {
  checks += 1;
  if (!ok) {
    failed += 1;
    console.log("FAIL", name);
  }
}

const hit = (id: string, extra: Partial<IndexHit> = {}): IndexHit => ({
  objectID: id,
  title: `Fix ${id}`,
  language: "TypeScript",
  assignee: "none",
  assigned: 0,
  ...extra,
});

// Opt-out
check("suggestions on by default", parseBotConfig(null).suggestIssues === true);
check("suggest_issues: false turns it off", parseBotConfig("suggest_issues: false").suggestIssues === false);
check("suggest-issues: no turns it off", parseBotConfig("suggest-issues: no").suggestIssues === false);
check("bad value keeps default", parseBotConfig("suggest_issues: maybe").suggestIssues === true);

// Picking order: this repo, then language, then anything
const picked = pickSuggestions(
  {
    sameRepo: [hit("acme/app/5"), hit("acme/app-docs/9"), hit("acme/app/7")],
    sameLanguage: [hit("x/one/1"), hit("x/one/2"), hit("x/one/3"), hit("y/two/4")],
    any: [hit("z/three/8", { language: "Go" })],
  },
  { repo: "Acme/App", skipNumbers: [7] },
);
const ids = picked.map((s) => `${s.owner}/${s.repo}#${s.number}`);
check("same repo first", ids[0] === "acme/app#5" && picked[0].sameRepo);
check("closed linked issue skipped", !ids.includes("acme/app#7"));
check("other repo in same-repo list not treated as same repo", !picked.some((s) => s.repo === "app-docs" && s.sameRepo));
check("at most two from one other repo", ids.filter((i) => i.startsWith("x/one#")).length === 2);
check("language before anything", ids.indexOf("y/two#4") < ids.indexOf("z/three#8"));
check("fills from anything", ids.includes("z/three#8"));

const skipped = pickSuggestions(
  {
    sameRepo: [],
    sameLanguage: [
      hit("a/b/1", { assigned: 2 }),
      hit("a/b/2", { assignee: "assigned" }),
      hit("a/b/3", { title: "" }),
      { objectID: "not-an-id", title: "x" },
      { objectID: "a/b/0", title: "x" },
      hit("a/c/4"),
      hit("a/c/4"),
    ],
    any: [],
  },
  { repo: "q/r" },
);
check("assigned, empty and bad ids skipped; duplicates dropped", skipped.length === 1 && skipped[0].number === 4);
check("limit respected", pickSuggestions({ sameRepo: [], sameLanguage: [], any: Array.from({ length: 30 }, (_, i) => hit(`r${i}/p/${i + 1}`)) }, { repo: "q/r" }).length === 8);

// Titles are untrusted
const t = safeTitle("Ping @maintainer <!-- hide --> [x](http://evil) `code`\nnext line");
check("no raw mention", !/@m/.test(t));
check("no html comment", !t.includes("<!--") && !t.includes("-->"));
check("no link breakout", !/(^|[^\\])\[/.test(t) && !/(^|[^\\])\]/.test(t));
check("one line", !t.includes("\n"));
check("long title clipped", safeTitle("a".repeat(200)).length === 90);

// Block
const block = formatNextIssuesBlock(picked);
const text = block.join("\n");
check("block has markers", block[0] === NEXT_ISSUES_START && block[block.length - 1] === NEXT_ISSUES_END);
check("block has three items", block.filter((l) => l.startsWith("- [")).length === 3);
check("block links issues", text.includes("(https://github.com/acme/app/issues/5)"));
check("block mentions opt-out", text.includes("suggest_issues: false"));
check("empty list gives empty block", formatNextIssuesBlock([]).length === 0);
check("one item reads singular", formatNextIssuesBlock(picked.slice(0, 1)).join("\n").includes("an open beginner issue"));

// Placement in the single summary comment
const summary = [
  "<!-- firstprbot:pr-summary -->",
  "| Check | Result | Notes |",
  "| First-time contributor | Yes | First PR to this repo |",
  "",
  "#### What a maintainer should look at",
  "",
  "- something",
  "",
  "---",
  "<sub>footer</sub>",
].join("\n");
const withBlock = insertNextIssuesBlock(summary, block);
check("inserted before maintainer section", withBlock.indexOf(NEXT_ISSUES_START) < withBlock.indexOf("#### What a maintainer"));
check("detects the block", hasNextIssuesBlock(withBlock) && !hasNextIssuesBlock(summary));
const replaced = insertNextIssuesBlock(withBlock, formatNextIssuesBlock(picked.slice(0, 1)));
check("replacing keeps one block", replaced.split(NEXT_ISSUES_START).length === 2);
check("replacing swaps content", replaced.split("\n").filter((l) => l.startsWith("- [")).length === 1);
check("empty block leaves body alone", insertNextIssuesBlock(summary, []) === summary);
const noHeading = insertNextIssuesBlock("intro\n\n---\n<sub>f</sub>", block);
check("falls back to before footer", noHeading.indexOf(NEXT_ISSUES_START) < noHeading.indexOf("---"));
check("appends when nothing to anchor on", insertNextIssuesBlock("plain", block).endsWith(`${NEXT_ISSUES_END}\n`));

// Rewrites keep the block
const kept = extractNextIssuesBlock(withBlock);
check("extract returns the block", kept.join("\n") === text);
check("extract on none is empty", extractNextIssuesBlock(summary).length === 0 && extractNextIssuesBlock(null).length === 0);
check("rewrite keeps the block", hasNextIssuesBlock(insertNextIssuesBlock(summary, kept)));

// First-timer and language helpers
check("summary first-timer row read", summarySaysFirstTimer(summary));
check("returning contributor row read", !summarySaysFirstTimer(summary.replace("| Yes |", "| No |")));
check("language filter quoted", languageFilter("C++") === 'language:"C++"');
check("language filter escapes quotes", languageFilter('Go" OR x') === 'language:"Go\\" OR x"');
check("empty language gives no filter", languageFilter("  ") === null);

if (failed) {
  console.log(`${failed} next issue checks failed`);
  process.exit(1);
}
console.log(`next issues ok (${checks} checks)`);