// Runs every scripts/verify-*.ts with tsx and prints one line per script.
//   npm run verify        offline checks (no network keys, no paid API calls)
//   npm run verify:live   checks that call GitHub or the model; reads .env
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// These call a paid model, need the Neysa keys, or need a PR to point at, so they only run on request.
const LIVE = new Set([
  "verify-auto-labels-live.ts",
  "verify-hints.ts",
  "verify-learn.ts",
  "verify-openai-backup.ts",
  "verify-pick-chain.ts",
  "verify-review.ts",
]);

const live = process.argv.includes("--live");

// node --env-file can't read the multi-line private key, so parse .env here.
// Offline runs only get GITHUB_TOKEN (so GitHub reads aren't rate limited at
// 60/hour); live runs get everything. Values are never printed.
function readEnv() {
  if (!existsSync(".env")) return {};
  const out = {};
  const lines = readFileSync(".env", "utf8").replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(lines[i]);
    if (!m) continue;
    let value = m[2];
    if (value.includes("-----BEGIN") && !value.includes("-----END")) {
      while (i + 1 < lines.length && !value.includes("-----END")) value += "\n" + lines[++i];
    }
    if (/^(["']).*\1$/s.test(value)) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}
const fileEnv = readEnv();
const childEnv = live
  ? { ...process.env, ...fileEnv }
  : { ...process.env, ...(fileEnv.GITHUB_TOKEN ? { GITHUB_TOKEN: fileEnv.GITHUB_TOKEN } : {}) };
const dir = join(process.cwd(), "scripts");
const files = readdirSync(dir)
  .filter((f) => /^verify-.*\.ts$/.test(f))
  .filter((f) => (live ? LIVE.has(f) : !LIVE.has(f)))
  .sort();

let failed = 0;
for (const f of files) {
  const args = [join("node_modules", "tsx", "dist", "cli.mjs")];
  args.push(join("scripts", f), ...process.argv.slice(2).filter((a) => a !== "--live"));
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env: childEnv });
  const ok = r.status === 0;
  if (!ok) failed++;
  const last = (r.stdout || "").trim().split("\n").pop() ?? "";
  console.log(`${ok ? "pass" : "FAIL"}  ${f}${last ? `  ${last.slice(0, 120)}` : ""}`);
  if (!ok) console.log((r.stderr || "").trim().split("\n").slice(-5).map((l) => `      ${l}`).join("\n"));
}
console.log(`${files.length - failed}/${files.length} verify scripts passed`);
process.exit(failed ? 1 : 0);
