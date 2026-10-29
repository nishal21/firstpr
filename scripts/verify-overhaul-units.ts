/**
 * Pure checks for availability, setup estimate, scorecard, and journey encoding.
 * No network.
 */
import assert from "node:assert/strict";
import { findClaims, judgeAvailability } from "../lib/availability";
import { decodeJourney, encodeJourney, sanitizeEvents } from "../lib/journey";
import { scoreNewcomerReady } from "../lib/ready-score";
import { estimateFromFiles } from "../lib/setup-estimate";
import type { IssueComment } from "../lib/github";

const now = Date.parse("2026-10-29T00:00:00Z");

function comment(partial: Partial<IssueComment> & Pick<IssueComment, "body" | "createdAt">): IssueComment {
  return {
    user: partial.user ?? "ada",
    body: partial.body,
    createdAt: partial.createdAt,
    isBot: partial.isBot ?? false,
  };
}

const claimed = findClaims(
  [
    comment({
      body: "I'll take this issue over the weekend.",
      createdAt: "2026-10-20T00:00:00Z",
    }),
  ],
  now,
);
assert.equal(claimed.length, 1);

const maintainer = findClaims(
  [comment({ user: "maintainer", body: "Please take this issue if you can.", createdAt: "2026-10-20T00:00:00Z" })],
  now,
);
assert.equal(maintainer.length, 0);

const released = findClaims(
  [
    comment({ body: "I'll take this.", createdAt: "2026-10-10T00:00:00Z" }),
    comment({ body: "I can't finish it. Someone else should.", createdAt: "2026-10-12T00:00:00Z" }),
  ],
  now,
);
assert.equal(released.length, 0);

const stale = findClaims(
  [comment({ body: "I'll take this.", createdAt: "2026-01-01T00:00:00Z" })],
  now,
);
assert.equal(stale.length, 0);

const free = judgeAvailability({
  state: "open",
  assignees: [],
  pulls: [],
  comments: [],
  now,
});
assert.equal(free.status, "free");

const assigned = judgeAvailability({
  state: "open",
  assignees: ["octocat"],
  pulls: [],
  comments: [],
  now,
});
assert.equal(assigned.status, "assigned");

const linked = judgeAvailability({
  state: "open",
  assignees: [],
  pulls: [
    {
      number: 4,
      title: "Fix menu",
      htmlUrl: "https://github.com/acme/app/pull/4",
      user: "bea",
      state: "open",
    },
  ],
  comments: [],
  now,
});
assert.equal(linked.status, "linked_pr");

const unknown = judgeAvailability({
  state: "open",
  assignees: [],
  pulls: [],
  comments: null,
  now,
});
assert.equal(unknown.status, "unknown");

const dev = estimateFromFiles({
  paths: [".devcontainer/devcontainer.json", "README.md"],
  readme: "## Getting started\n\n- Open in Codespaces\n",
  contributing: "Read this before you open a PR. Keep the change small and run the tests.",
  packageJson: null,
});
const bare = estimateFromFiles({
  paths: ["src/main.c"],
  readme: "A program.",
  contributing: null,
  packageJson: null,
});
assert.ok(dev.minutes < bare.minutes, `${dev.minutes} should be under ${bare.minutes}`);
assert.ok(dev.steps.length >= 1);

const ready = scoreNewcomerReady({
  paths: ["LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", ".github/ISSUE_TEMPLATE/bug.md", "README.md"],
  openUnassignedGfi: 3,
  setupMinutes: 30,
  hasSetupHeading: true,
});
assert.equal(ready.score, 100);
assert.equal(ready.checks.reduce((sum, check) => sum + check.max, 0), 100);

const empty = scoreNewcomerReady({
  paths: [],
  openUnassignedGfi: 0,
  setupMinutes: 90,
  hasSetupHeading: false,
});
assert.equal(empty.score, 0);

const events = sanitizeEvents([
  {
    at: "2026-10-29T00:00:00.000Z",
    kind: "explain",
    title: "acme/app#3",
    href: "/issue/acme/app/3",
  },
]);
assert.ok(events);
assert.equal(decodeJourney(encodeJourney(events!))?.[0].title, "acme/app#3");
assert.equal(decodeJourney("not-json"), null);
assert.equal(sanitizeEvents([{ kind: "nope" }]), null);

console.log("overhaul unit checks passed");
