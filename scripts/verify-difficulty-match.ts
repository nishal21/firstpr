/**
 * Load .env into the process before importing app modules, then rate demo issues.
 * Usage (PowerShell): load env vars, then `npx tsx scripts/verify-difficulty-match.ts`
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const { assessDifficulty, difficultyBadgeLabel } = await import(
    "../lib/difficulty"
  );
  const { getIssue } = await import("../lib/github");
  const { matchIssues } = await import("../lib/match");

  const stamp = Date.now();
  const n4 = await getIssue("nishal21", "NekoDroid", 4);
  const d4 = await assessDifficulty({
    title: n4.title,
    body: n4.body,
    cacheKey: `verify:n4:${stamp}`,
  });
  console.log(
    "NekoDroid#4",
    d4,
    difficultyBadgeLabel(d4.level),
  );

  const g = await getIssue("Graphify-Labs", "graphify", 3666);
  const dg = await assessDifficulty({
    title: g.title,
    body: g.body,
    cacheKey: `verify:g3666:${stamp}`,
  });
  console.log(
    "graphify#3666",
    dg,
    difficultyBadgeLabel(dg.level),
  );

  const match = await matchIssues({
    username: "demo",
    repo: "nishal21/NekoDroid",
  });
  const four = [match.picked, ...match.others].find((i) => i?.number === 4);
  console.log(
    "match NekoDroid#4 badge",
    four?.difficultyBadge ?? "(not in open unassigned list)",
  );
  console.log(
    "picked",
    match.picked
      ? `#${match.picked.number} ${match.picked.difficultyBadge}`
      : null,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
