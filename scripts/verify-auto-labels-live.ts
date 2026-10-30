// Run with: node --env-file=.env scripts/verify-auto-labels-live.ts owner/repo#123 [more...]
// Read-only: loads real PR facts with GITHUB_TOKEN, prints the labels
// FirstPRbot would set and the raw facts behind them. Writes nothing.
import { Octokit } from "@octokit/rest";
import { AUTO_LABEL_GROUPS, computeAutoLabels, formatLabelsBlock, planLabelSync, sizeExclusion } from "../lib/auto-labels.ts";
import { loadLabelEvents, loadLabelFacts } from "../lib/auto-labels-github.ts";

// Wrapped in main() so tsx can run it without top-level await.
async function main(): Promise<void> {
  const kit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });
  const refs = process.argv.slice(2);
  if (refs.length === 0) {
    console.error("usage: node --env-file=.env scripts/verify-auto-labels-live.ts owner/repo#123 ...");
    process.exit(2);
  }

  for (const ref of refs) {
    const m = /^([\w.-]+)\/([\w.-]+)#(\d+)$/.exec(ref);
    if (!m) {
      console.error(`skip ${ref}: expected owner/repo#123`);
      continue;
    }
    const [, owner, repo, num] = m;
    const loaded = await loadLabelFacts(kit, owner, repo, Number(num));
    const { facts } = loaded;
    const result = computeAutoLabels(facts, new Set(AUTO_LABEL_GROUPS));
    const events = await loadLabelEvents(kit, owner, repo, facts.number, null);
    const plan = planLabelSync({ current: loaded.labels, desired: result.labels.map((l) => l.def.name), events });

    const counted = facts.files.filter((f) => !sizeExclusion(f.filename));
    const tally = (xs: (string | null)[]) =>
      Object.entries(xs.reduce<Record<string, number>>((a, x) => ((a[x ?? "null"] = (a[x ?? "null"] ?? 0) + 1), a), {}))
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
    console.log(`\n=== ${ref} ${facts.prUrl}`);
    console.log(`state: ${loaded.open ? "open" : "closed"}${loaded.draft ? " draft" : ""} head=${facts.headSha.slice(0, 7)} author=${facts.author} association=${facts.authorAssociation}`);
    console.log(`files: listed=${facts.files.length} changed_files=${facts.changedFiles} counted=${counted.length} lines=${counted.reduce((s, f) => s + f.additions + f.deletions, 0)}`);
    console.log(`paths: ${facts.files.slice(0, 12).map((f) => `${f.filename}(${f.additions}/${f.deletions})${sizeExclusion(f.filename) ? `[${sizeExclusion(f.filename)}]` : ""}`).join(" ")}${facts.files.length > 12 ? " ..." : ""}`);
    console.log(`closing: ${JSON.stringify(facts.closing)}`);
    if (facts.checks.ok) {
      console.log(`checks: runs ${facts.checks.runs.length} [status ${tally(facts.checks.runs.map((r) => r.status))}] [conclusion ${tally(facts.checks.runs.map((r) => r.conclusion))}]`);
      console.log(`statuses: ${facts.checks.statuses.map((s) => `${s.context}=${s.state}`).join(" ") || "none"}`);
      console.log(`suites: ${facts.checks.suites.map((s) => `${s.app}:${s.status}/${s.conclusion}/${s.runCount}`).join(" ") || "none"}`);
    } else console.log(`checks: unreadable (${facts.checks.reason})`);
    console.log(`current labels: ${loaded.labels.join(", ") || "none"}`);
    console.log(`plan (not applied): add=${plan.add.join("|") || "-"} remove=${plan.remove.join("|") || "-"} held=${plan.heldByMaintainer.join("|") || "-"}`);
    console.log(formatLabelsBlock(result, { status: "applied", plan }).join("\n"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
