// node scripts/verify-cron-monitors.ts
// Every cron in vercel.json needs a Sentry monitor with the same schedule.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CRON_MONITORS, monitorConfig } from "../lib/cron-monitors.ts";

const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
  crons?: { path: string; schedule: string }[];
};
const crons = vercel.crons ?? [];
assert.ok(crons.length > 0, "vercel.json has no crons");

const slugs = new Set<string>();
for (const cron of crons) {
  const path = cron.path.split("?")[0];
  const monitor = CRON_MONITORS[path];
  assert.ok(monitor, `no Sentry monitor for ${path}`);
  assert.equal(monitor.schedule, cron.schedule, `schedule drift for ${path}`);
  assert.match(monitor.slug, /^[a-z0-9-]{1,50}$/, `bad slug ${monitor.slug}`);
  assert.ok(!slugs.has(monitor.slug), `duplicate slug ${monitor.slug}`);
  slugs.add(monitor.slug);
  const config = monitorConfig(monitor);
  assert.equal(config.schedule.value, cron.schedule);
  assert.equal(config.timezone, "Etc/UTC");
}
for (const path of Object.keys(CRON_MONITORS)) {
  assert.ok(crons.some((c) => c.path.split("?")[0] === path), `monitor ${path} has no cron in vercel.json`);
}

console.log(`verify-cron-monitors: ok (${crons.length} cron${crons.length === 1 ? "" : "s"})`);