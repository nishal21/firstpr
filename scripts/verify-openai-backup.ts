/**
 * Prove backup key works when primary is fake.
 * npx tsx --env-file=.env scripts/verify-openai-backup.ts
 */
process.env.OPENAI_API_KEY = "sk-fake-primary-for-backup-test";

import { ping, generateJson } from "../lib/llm";
import { z } from "zod";

async function main() {
  const p = await ping();
  console.log("[ping]", p);

  const review = await generateJson({
    task: "review",
    system: "Reply with JSON only.",
    user: "Say ready is true.",
    schema: z.object({ ready: z.literal(true) }),
    schemaName: "review_ping",
    effort: "low",
  });
  console.log("[review-task]", review);
  console.log(JSON.stringify({ ok: p.ok === true && review.ready === true }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
