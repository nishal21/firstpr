/**
 * Offline checks for what the webhook answers. Ignored events must be 2xx and
 * count as accepted on the status page; only bad signatures and non-JSON
 * bodies are 4xx. Signs with a throwaway secret, never a real one.
 * npx tsx scripts/verify-webhook-gate.ts
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { countDeliveries, gateWebhook } from "../lib/webhook-gate.ts";

let failed = 0;
let count = 0;
function check(name: string, ok: boolean): void {
  count += 1;
  if (!ok) {
    failed += 1;
    console.log("FAIL", name);
  }
}

const SECRET = "test-only-secret";
// Same scheme GitHub uses: sha256= plus the hex HMAC of the raw body.
async function sign(secret: string, body: string): Promise<string> {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}
async function verifier(body: string, sig: string): Promise<boolean> {
  const want = Buffer.from(await sign(SECRET, body));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

async function main(): Promise<void> {
  const ignored: [string, unknown][] = [
    ["status", { state: "success", sha: "abc", repository: { full_name: "acme/w" } }],
    ["check_run", { action: "completed", check_run: { id: 1 } }],
    ["check_suite", { action: "requested", check_suite: { id: 2 } }],
    ["push", { ref: "refs/heads/main" }],
    ["ping", { zen: "Keep it logically awesome." }],
    ["star", { action: "created" }],
    ["some_future_event", { action: "whatever" }],
    ["pull_request", { action: "labeled" }],
  ];
  for (const [name, payload] of ignored) {
    const body = JSON.stringify(payload);
    const r = await gateWebhook({ id: "d-1", name, signature: await sign(SECRET, body) }, body, verifier);
    check(`${name} is accepted with 2xx`, r.ok && r.status >= 200 && r.status < 300);
  }

  const body = JSON.stringify({ action: "opened" });
  const good = await sign(SECRET, body);
  const wrong = await sign("other-secret", body);

  const bad = await gateWebhook({ id: "d", name: "pull_request", signature: wrong }, body, verifier);
  check("wrong signature is 401", !bad.ok && bad.status === 401 && bad.signatureMismatch);

  const tampered = await gateWebhook({ id: "d", name: "pull_request", signature: good }, body + " ", verifier);
  check("tampered body is 401", !tampered.ok && tampered.status === 401);

  const missing = await gateWebhook({ id: "d", name: "pull_request", signature: null }, body, verifier);
  check("missing signature is 401 without a mismatch report", !missing.ok && missing.status === 401 && !missing.signatureMismatch);

  const noEvent = await gateWebhook({ id: "d", name: null, signature: good }, body, verifier);
  check("missing event header is 401", !noEvent.ok && noEvent.status === 401);

  const throws = await gateWebhook({ id: "d", name: "status", signature: good }, body, async () => {
    throw new Error("boom");
  });
  check("verifier that throws counts as a bad signature", !throws.ok && throws.status === 401);

  const notJson = "payload=%7B%7D";
  const form = await gateWebhook({ id: "d", name: "status", signature: await sign(SECRET, notJson) }, notJson, verifier);
  check("signed non-JSON body is 400", !form.ok && form.status === 400 && form.code === "bad_request");

  const ok = await gateWebhook({ id: "d", name: "pull_request", signature: good }, body, verifier);
  check("valid PR event passes the parsed payload on", ok.ok && (ok.payload as { action?: string }).action === "opened");

  // Status page counting.
  const { counts } = countDeliveries([
    { event: "status", status_code: 202 },
    { event: "check_run", status_code: 202 },
    { event: "pull_request", status_code: 202 },
    { event: "pull_request", status_code: 200 },
    { event: "issues", status_code: 401 },
    { event: "issues", status_code: 500 },
    { event: "push", status_code: 0 },
    { event: "push" },
    { event: "ping", status_code: 200 },
  ]);
  check("ignored events count as accepted", counts.accepted === 4);
  check("pings are left out", counts.total === 8);
  check("client errors counted", counts.clientErrors === 1);
  check("server errors counted", counts.serverErrors === 1);
  check("no response counted", counts.noResponse === 2);

  if (failed) {
    console.log(`${failed} of ${count} webhook gate checks failed`);
    process.exit(1);
  }
  console.log(`webhook gate ok (${count} checks)`);
}

void main();