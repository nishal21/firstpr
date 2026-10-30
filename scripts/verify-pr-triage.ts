/**
 * Offline checks for first-time PR triage. Most cases are normal PRs that
 * must stay quiet: false positives matter more than misses.
 * npx tsx scripts/verify-pr-triage.ts
 */
import { parseBotConfig } from "../lib/bot-config.ts";
import {
  TRIAGE_LABELED_MARKER,
  assistantPhraseIn,
  buildTriagePrompt,
  diffFacts,
  distinctiveTitle,
  formatTriageLines,
  parseTriageReply,
  readCachedTriageModel,
  softPhraseCount,
  templateIgnored,
  triagePr,
  withModelRead,
  TRIAGE_MAX_INPUT_CHARS,
  type TriageFacts,
} from "../lib/pr-triage.ts";

let failed = 0;
let count = 0;
function check(name: string, ok: boolean): void {
  count += 1;
  if (!ok) {
    failed += 1;
    console.log("FAIL", name);
  }
}

const normal: TriageFacts = {
  accountAgeDays: 900,
  sameTitleOtherRepos: 0,
  templateIgnored: false,
  additionsExcludingLocks: 40,
  changedFiles: 2,
  docsOnly: false,
  hasLinkedIssue: true,
  assistantPhrase: null,
  softPhraseCount: 0,
};
const quiet = (name: string, f: Partial<TriageFacts>) => {
  const r = triagePr({ ...normal, ...f });
  check(`quiet: ${name}`, !r.show && !r.label);
  return r;
};

// False-positive guard: normal first PRs, including awkward ones.
quiet("ordinary fix", {});
quiet("brand new account, small fix", { accountAgeDays: 0.2 });
quiet("new account and ignored template", { accountAgeDays: 1, templateIgnored: true });
quiet("new account, template ignored, huge, docs only, no issue", {
  accountAgeDays: 2,
  templateIgnored: true,
  additionsExcludingLocks: 5000,
  changedFiles: 80,
  docsOnly: true,
  hasLinkedIssue: false,
});
quiet("big refactor by an old account", { additionsExcludingLocks: 9000, changedFiles: 120 });
quiet("typo fixer across many repos (generic title gives 0)", { sameTitleOtherRepos: 0, docsOnly: true, hasLinkedIssue: false });
quiet("search failed", { sameTitleOtherRepos: null, accountAgeDays: null });
quiet("soft phrases alone", { softPhraseCount: 6 });
const borderline = quiet("same title in 3 repos, nothing else", { sameTitleOtherRepos: 3 });
check("that case is borderline, not shown", borderline.borderline);
quiet("assistant wording alone", { assistantPhrase: "as an ai language model" });
quiet("same title in 2 repos plus new account", { sameTitleOtherRepos: 2, accountAgeDays: 1 });

// Text checks that must not fire.
check("quoted code is ignored", assistantPhraseIn("Strips the prefix:\n```\nAs an AI language model, I cannot\n```") === null);
check("inline code is ignored", assistantPhraseIn("Filter out `as an AI language model` replies") === null);
check("blockquote is ignored", assistantPhraseIn("> As an AI language model I can't\n\nThis removes that line from bot output.") === null);
check("real assistant wording found", assistantPhraseIn("Certainly! Here is the updated code for your project.") === "certainly! here is");
check("curly quotes handled", assistantPhraseIn("I don\u2019t have access to the repository, but") !== null);
check("short body has no soft count", softPhraseCount("seamless delve streamline") === 0);
const slop = `This pull request aims to streamline the codebase and deliver a seamless, comprehensive solution. ${"x ".repeat(200)} In conclusion, I hope this helps.`;
check("long generated-looking body counts", softPhraseCount(slop) >= 3);
check("generic title not distinctive", !distinctiveTitle("Fix typo") && !distinctiveTitle("Update README.md") && !distinctiveTitle("docs: update"));
check("specific title is distinctive", distinctiveTitle("Add dark mode toggle to the settings page"));
check("issue numbers ignored in titles", distinctiveTitle("Fix #123") === false);

// PR template.
const template = "## Description\n<!-- what changed -->\n## How was this tested\n- [ ] I ran the tests\n";
check("filled template is not ignored", !templateIgnored(template, "## Description\nFixes the tz bug\n## How was this tested\nnpm test"));
check("partly filled template is not ignored", !templateIgnored(template, "Description: fixes dates"));
check("empty body ignores template", templateIgnored(template, ""));
check("unrelated body ignores template", templateIgnored(template, "pls merge"));
check("no template, nothing to ignore", !templateIgnored(null, ""));
check("one-heading template is too thin to judge", !templateIgnored("## Notes\n", ""));

// Diff facts.
const d = diffFacts([
  { filename: "package-lock.json", additions: 8000 },
  { filename: "src/a.ts", additions: 10 },
]);
check("lockfiles don't count as huge", d.additionsExcludingLocks === 10 && !d.docsOnly);
check("docs only detected", diffFacts([{ filename: "README.md", additions: 1 }, { filename: "docs/x.mdx", additions: 2 }]).docsOnly);

// Cases that should show.
const mass = triagePr({ ...normal, sameTitleOtherRepos: 5, accountAgeDays: 1 });
check("mass-opened + new account shows", mass.show && mass.label);
const massTemplate = triagePr({ ...normal, sameTitleOtherRepos: 4, templateIgnored: true });
check("mass-opened + ignored template shows and labels", massTemplate.show && massTemplate.label);
const massHuge = triagePr({ ...normal, sameTitleOtherRepos: 4, additionsExcludingLocks: 3000 });
check("mass-opened + huge shows without label", massHuge.show && !massHuge.label);
const ai = triagePr({ ...normal, assistantPhrase: "as an ai language model", docsOnly: true, hasLinkedIssue: false });
check("assistant wording + docs-only shows, no label", ai.show && !ai.label);
check("note never names intent", mass.lines.every((l) => !/spam|slop|bot|fake|lazy|cheat/i.test(l)));

// Borderline model read.
check("model yes lifts borderline", withModelRead(borderline, true).show);
check("model no keeps quiet", !withModelRead(borderline, false).show);
check("no model keeps quiet", !withModelRead(borderline, null).show);
const notBorderline = triagePr({ ...normal, accountAgeDays: 1 });
check("model can't lift a case with no strong fact", !withModelRead(notBorderline, true).show);
check("model reply parsed", parseTriageReply('{"closer_look": true}') === true && parseTriageReply("maybe") === null);
check("triage prompt capped", buildTriagePrompt({ title: "t", body: "b".repeat(90_000) }, [{ filename: "a.ts", additions: 1, deletions: 0, patch: "+x\n".repeat(20_000) }]).length <= TRIAGE_MAX_INPUT_CHARS);

// Comment lines and markers.
const lines = formatTriageLines(mass, { modelKey: "acme/w#1@abc", modelAnswer: false, labeled: true });
check("labeled marker kept", lines.includes(TRIAGE_LABELED_MARKER));
check("model answer cached", readCachedTriageModel(lines.join("\n"), "acme/w#1@abc") === false);
check("cache misses on another commit", readCachedTriageModel(lines.join("\n"), "acme/w#1@def") === null);
check("visible note is neutral", lines.join("\n").includes("None of them is a judgment on the contributor"));
check("quiet result writes nothing visible", formatTriageLines(borderline, { labeled: false }).length === 0);
check("labeled marker survives a quiet result", formatTriageLines(borderline, { labeled: true })[0] === TRIAGE_LABELED_MARKER);

// Config.
const cfg = parseBotConfig("");
check("triage on by default", cfg.triage && cfg.triageLabel);
const off = parseBotConfig("triage: false\ntriage_label: false");
check("triage opt-outs", !off.triage && !off.triageLabel);

if (failed) {
  console.log(`${failed} of ${count} triage checks failed`);
  process.exit(1);
}
console.log(`pr triage ok (${count} checks)`);
