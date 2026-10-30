// node scripts/verify-sentry-scrub.ts
import assert from "node:assert/strict";
import { FILTERED, scrubBreadcrumb, scrubEvent, scrubString } from "../lib/sentry-scrub.ts";

// Fake values built at runtime so no scanner mistakes them for real secrets.
const ghToken = "ghp_" + "A1b2C3d4".repeat(5);
const patToken = "github_pat_" + "x".repeat(30);
const openAiKey = "sk-" + "proj_" + "z".repeat(30);
const jwt = ["eyJhbGciOiJSUzI1NiJ9", "eyJpc3MiOiIxMjMifQxx", "c2lnbmF0dXJlc2lnbmF0dXJl"].join(".");
const pem = ["-----BEGIN RSA PRIVATE KEY-----", "MIIEow" + "Q".repeat(40), "-----END RSA PRIVATE KEY-----"].join("\n");

for (const secret of [ghToken, patToken, openAiKey, jwt]) {
  const out = scrubString(`failed with ${secret} today`);
  assert.ok(!out.includes(secret), `leaked ${secret.slice(0, 6)}`);
  assert.ok(out.includes(FILTERED));
}
assert.equal(scrubString(`key:\n${pem}\nend`), "key:\n[Filtered private key]\nend");
assert.ok(!scrubString(pem.split("\n").slice(0, 2).join("\n")).includes("MIIEow"), "cut-off PEM leaked");
assert.equal(scrubString("Authorization: Bearer abcdefghijklmnop1234"), `Authorization: Bearer ${FILTERED}`);
assert.equal(scrubString("mail me at someone@example.com"), "mail me at [email]");
assert.equal(
  scrubString("https://x.dev/cb?code=abc123&state=ok&access_token=zzz&page=2"),
  `https://x.dev/cb?code=${FILTERED}&state=ok&access_token=${FILTERED}&page=2`,
);
// Ordinary text stays readable.
assert.equal(scrubString("pull_request.opened on nishal21/firstpr#12"), "pull_request.opened on nishal21/firstpr#12");

const event = scrubEvent({
  message: `boom ${ghToken}`,
  request: {
    url: "https://firstpr.nishal.dev/api/cron/sync-issues?token=abc",
    query_string: "token=abc&page=1",
    cookies: { session: "s" },
    data: { secret: "body" },
    headers: {
      Authorization: "Bearer abc",
      Cookie: "a=b",
      "X-Hub-Signature-256": "sha256=abc",
      "User-Agent": "vercel-cron/1.0",
      "X-GitHub-Event": "pull_request",
    },
  },
  user: { id: "42", email: "a@b.co", ip_address: "1.2.3.4", username: "someone" },
  tags: { "github.repo": "nishal21/firstpr", author: "nishal21" },
  extra: {
    GITHUB_APP_PRIVATE_KEY: pem,
    nested: { apiKey: "k", list: [{ client_secret: "c" }, `x ${openAiKey}`] },
    usage: { input_tokens: 120 },
  },
  exception: { values: [{ type: "Error", value: `Bad credentials ${patToken}` }] },
});

assert.ok(!JSON.stringify(event).includes(ghToken));
assert.ok(!JSON.stringify(event).includes(patToken));
assert.ok(!JSON.stringify(event).includes(openAiKey));
assert.ok(!JSON.stringify(event).includes("MIIEow"));
assert.equal(event.request.cookies, undefined);
assert.equal(event.request.data, undefined);
assert.deepEqual(event.request.headers, { "user-agent": "vercel-cron/1.0", "x-github-event": "pull_request" });
assert.equal(event.request.url, `https://firstpr.nishal.dev/api/cron/sync-issues?token=${FILTERED}`);
assert.equal(event.request.query_string, `token=${FILTERED}&page=1`);
assert.deepEqual(event.user, { id: "42" });
assert.equal(event.tags.author, "nishal21", "'author' must not be mistaken for an auth key");
assert.equal(event.extra.GITHUB_APP_PRIVATE_KEY, FILTERED);
assert.equal(event.extra.nested.apiKey, FILTERED);
assert.equal((event.extra.nested.list[0] as { client_secret: string }).client_secret, FILTERED);
assert.equal(event.extra.usage.input_tokens, 120, "token counts are not secrets");

// Cycles must not hang.
const loop: Record<string, unknown> = { name: "loop" };
loop.self = loop;
scrubEvent({ extra: loop });

const crumb = scrubBreadcrumb({ category: "fetch", data: { url: "https://api.github.com/x?access_token=abc" } });
assert.equal(crumb.data.url, `https://api.github.com/x?access_token=${FILTERED}`);

console.log("verify-sentry-scrub: ok");