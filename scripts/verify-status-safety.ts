// Run with: node scripts/verify-status-safety.ts
// Builds the public status report from checks that fail with errors full of fake
// secrets, and from checks that try to smuggle secrets into their output, then
// asserts none of it reaches the JSON.
import {
  isSafeDetail,
  runCheck,
  toPublicReport,
  type CheckResult,
  type Probe,
} from "../lib/status-report.ts";

const FAKE = [
  "ghp_FAKEtoken1234567890abcdefABCDEF",
  "ALGOLIA_ADMIN_KEY",
  "fake-admin-key-9f8e7d6c5b4a39281706",
  "FIRSTPR_CRON_SECRET",
  "-----BEGIN RSA PRIVATE KEY-----",
  "internal-db.svc.cluster.local",
  "https://hooks.internal.example/secret",
  "10.0.12.7",
  "installation 48213377",
  "delivery 1b2c3d4e-5f60-7182-93a4-b5c6d7e8f901",
  "someone-private/secret-repo",
  "octocat",
  "firstpr_issues",
  "X1Y2Z3APPID",
  "at Object.<anonymous> (/var/task/lib/status-checks.js:42:13)",
  "x-ratelimit-remaining: 4321",
];

let failures = 0;
function check(name: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "pass" : "FAIL"} ${name}`);
}

const secretBlob = FAKE.join(" | ");
const throwing: Probe = async () => {
  const err = new Error(`boom ${secretBlob}`);
  (err as Error & { cause?: unknown }).cause = { token: FAKE[0], url: FAKE[6] };
  throw err;
};
const leaky: Probe = async () => ({
  state: "operational",
  detail: `Answered from ${FAKE[6]} with key ${FAKE[0]}`,
  lastEventAt: FAKE[5],
});
const hanging: Probe = (signal) =>
  new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error(secretBlob))));

const errorsSeen: unknown[] = [];
const opts = { timeoutMs: 50, onError: (_id: string, err: unknown) => errorsSeen.push(err) };

const results: CheckResult[] = await Promise.all([
  runCheck("website", throwing, opts),
  runCheck("api", leaky, opts),
  runCheck("github", hanging, opts),
  runCheck("search", throwing, opts),
  runCheck("bot", async () => ({
    state: "degraded",
    detail: `20 of the last 25 webhook deliveries were accepted.`,
    deliveries: { accepted: 20, total: 25, clientErrors: 3, serverErrors: 1, noResponse: 1 },
    // Extra fields a careless probe might add. None may survive.
    ...({ repo: FAKE[10], installationId: 48213377, guid: FAKE[9], sender: FAKE[11] } as object),
  }), opts),
  runCheck("sync", throwing, opts),
]);

// A result object with smuggled fields, as if a future probe copied a raw response.
const tampered = { ...results[1], name: FAKE[12], host: FAKE[5], env: { [FAKE[1]]: FAKE[2] } } as CheckResult;
const report = toPublicReport(
  [results[0], tampered, ...results.slice(2)],
  { days: 30, runs: 4, ok: 3, prs: 2, ...({ repos: [FAKE[10]] } as object) },
  Date.UTC(2026, 9, 30, 12, 0, 0),
);
const json = JSON.stringify(report);

for (const secret of FAKE) check(`no "${secret.slice(0, 24)}" in output`, !json.includes(secret));
for (const word of ["boom", "stack", "token", "key", "secret", "/var/", "http", "installation", "guid", "repo\"", "sender"]) {
  check(`no "${word}" in output`, !json.toLowerCase().includes(word.toLowerCase()));
}

check("thrown errors went to onError only", errorsSeen.length === 3);
check("timeouts are not reported as errors", !errorsSeen.some((e) => String(e).includes("abort")));
check("failing checks are down", ["website", "github", "search", "sync"].every((id) => report.checks.find((c) => c.id === id)?.state === "down"));
check("leaky detail was replaced", report.checks.find((c) => c.id === "api")?.detail === "Working.");
check("leaky lastEventAt dropped", report.checks.find((c) => c.id === "api")?.lastEventAt === null);
check("names come from the fixed list", report.checks.map((c) => c.name).join("|") === "Website|API|GitHub API|Issue search|FirstPRbot webhook|Search index sync");
check("overall is down when the website is down", report.overall === "down");
check("reason names only checks", report.reason === "Website, GitHub API, Issue search and Search index sync are not answering. API and FirstPRbot webhook are slow or partly failing." || report.reason.startsWith("Website, GitHub API"));
check("timeout retried once", results[2].retried === true);
check("delivery counts kept as numbers only", JSON.stringify(report.webhookDeliveries) === '{"accepted":20,"total":25,"clientErrors":3,"serverErrors":1,"noResponse":1}');
check("bot stats kept as numbers only", JSON.stringify(report.botLast30Days) === '{"days":30,"runs":4,"ok":3,"prs":2}');

const allowedKeys = new Set(["overall", "reason", "generatedAt", "refreshSeconds", "database", "checks", "botLast30Days", "webhookDeliveries"]);
check("top-level keys are allowlisted", Object.keys(report).every((k) => allowedKeys.has(k)));
const checkKeys = "id,name,state,latencyMs,checkedAt,detail,lastEventAt";
check("check keys are allowlisted", report.checks.every((c) => Object.keys(c).join(",") === checkKeys));

// Cold start: a slow first try is retried and the warm answer is used.
let calls = 0;
const cold: Probe = async () => {
  calls++;
  if (calls === 1) await new Promise((r) => setTimeout(r, 80));
  return { state: "operational", detail: "The API answers." };
};
const coldResult = await runCheck("api", cold, { retryIfOverMs: 40, slowMs: 60, timeoutMs: 500 });
check("cold start retried and not degraded", coldResult.retried && coldResult.state === "operational");
const slowAlways: Probe = async () => {
  await new Promise((r) => setTimeout(r, 80));
  return { state: "operational", detail: "The API answers." };
};
const slowResult = await runCheck("api", slowAlways, { retryIfOverMs: 40, slowMs: 60, timeoutMs: 500 });
check("still slow after retry is degraded", slowResult.state === "degraded");

check("detail filter accepts real sentences", [
  "The home page loads.",
  "GitHub answers. More than half of this hour's API quota is left.",
  "Search answers. 2,071 open issues are in the index.",
  "20 of the last 25 webhook deliveries were accepted. Latest 1 min ago.",
  "No finished run is recorded yet. The current pass started 20 h ago and has saved 2,000 issues.",
  "The home page answered with HTTP 503.",
].every(isSafeDetail));
// Usernames and short ids cannot be spotted by shape; they are kept out because
// details are fixed templates and probes never read those fields.
const SHAPED = FAKE.filter((s) => !["octocat", "X1Y2Z3APPID", "x-ratelimit-remaining: 4321"].includes(s));
for (const s of SHAPED) check(`detail filter refuses "${s.slice(0, 24)}"`, !isSafeDetail(`Answer ${s}`));

console.log(failures === 0 ? "all passed" : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
