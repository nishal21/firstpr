/**
 * Offline checks for the advisory issue-match line: what reaches the model,
 * how replies are read, the comment cache and the opt-out.
 * npx tsx scripts/verify-issue-match.ts
 */
import { parseBotConfig } from "../lib/bot-config.ts";
import {
  ISSUE_MATCH_MAX_INPUT_CHARS,
  buildIssueMatchPrompt,
  checkIssueMatch,
  formatIssueMatchLines,
  issueMatchKey,
  parseIssueMatch,
  readCachedIssueMatch,
} from "../lib/issue-match.ts";
import { compactDiff, redactSecrets } from "../lib/model-input.ts";

let failed = 0;
let count = 0;
function check(name: string, ok: boolean): void {
  count += 1;
  if (!ok) {
    failed += 1;
    console.log("FAIL", name);
  }
}

async function main(): Promise<void> {
  // Secrets never leave.
  const leaky = [
    'const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789"',
    "OPENAI_API_KEY=sk-proj-abcdefghijklmnop1234567890",
    "password: hunter22secret",
    "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----",
    "aws AKIAABCDEFGHIJKLMNOP",
    "blob Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1u",
  ].join("\n");
  const red = redactSecrets(leaky);
  check("github token masked", !red.includes("ghp_abc"));
  check("sk key masked", !red.includes("sk-proj"));
  check("password masked", !red.includes("hunter22"));
  check("pem masked", !red.includes("MIIEow"));
  check("aws key masked", !red.includes("AKIAABCD"));
  check("base64 blob masked", !red.includes("Zm9vYmFy"));
  const code = "src/components/settings/notifications/NotificationPreferencesPanel.tsx\nfunction formatDateForUserTimezoneWithFallback()";
  check("paths and names survive", redactSecrets(code) === code);

  const diff = compactDiff(
    [
      { filename: ".env.local", additions: 1, deletions: 0, patch: "+SECRET=abc" },
      { filename: "package-lock.json", additions: 900, deletions: 10, patch: "+lots" },
      { filename: "src/a.ts", additions: 2, deletions: 1, patch: "+const a = 1;" },
    ],
    2000,
  );
  check("env file content dropped", diff.includes(".env.local") && !diff.includes("SECRET=abc"));
  check("lockfile content dropped", !diff.includes("+lots"));
  check("code kept", diff.includes("+const a = 1;"));

  const huge = buildIssueMatchPrompt({
    issue: { number: 7, title: "Fix dates", body: "x".repeat(50_000) },
    pr: { title: "Fix dates", body: "y".repeat(50_000) },
    files: Array.from({ length: 80 }, (_, i) => ({
      filename: `src/f${i}.ts`,
      additions: 500,
      deletions: 0,
      patch: "+z\n".repeat(2000),
    })),
  });
  check("prompt is capped", huge.length <= ISSUE_MATCH_MAX_INPUT_CHARS);
  check("prompt keeps the issue", huge.startsWith("ISSUE #7: Fix dates"));

  check("yes parsed", parseIssueMatch('{"verdict":"yes","evidence":"formatDate now uses the tz"}')?.verdict === "yes");
  check("fenced json parsed", parseIssueMatch('```json\n{"verdict":"partly","evidence":"only the API"}\n```')?.verdict === "partly");
  check("unclear gives no line", parseIssueMatch('{"verdict":"unclear","evidence":""}') === null);
  check("garbage gives no line", parseIssueMatch("sure! it looks good") === null);

  const key = issueMatchKey("acme/widgets", 42, "3f9c2a1d8e7b6a5c4d3e", "#17");
  const lines = formatIssueMatchLines({ verdict: "no", evidence: "Only README.md changed, @maya" }, 17, key);
  check("line is advisory", lines[1].includes("advisory") && lines[1].includes("Doesn't look like it addresses #17"));
  check("mentions are defused", !lines[1].includes("@maya"));
  const body = `<!-- firstprbot:pr-summary -->\n${lines.join("\n")}\n`;
  check("cache reads its own marker", readCachedIssueMatch(body, key)?.evidence === "Only README.md changed, @maya");
  check("cache misses on a new commit", readCachedIssueMatch(body, issueMatchKey("acme/widgets", 42, "ffff", "#17")) === null);

  delete process.env.RUNWARE_API_KEY;
  const none = await checkIssueMatch(
    { issue: { number: 1, title: "t", body: null }, pr: { title: "t", body: null }, files: [] },
    "k",
    null,
  );
  check("no key is a no-op", none === null);
  const reused = await checkIssueMatch(
    { issue: { number: 17, title: "t", body: null }, pr: { title: "t", body: null }, files: [] },
    key,
    body,
  );
  check("cached result needs no key", reused?.verdict === "no");

  check("on by default", parseBotConfig("").issueCheck === true);
  check("issue_check: false turns it off", parseBotConfig("issue_check: false").issueCheck === false);

  if (failed) {
    console.log(`${failed} of ${count} issue match checks failed`);
    process.exit(1);
  }
  console.log(`issue match ok (${count} checks)`);
}

void main();
