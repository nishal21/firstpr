/**
 * Record demo fixtures via the local Next API (needs `npm run dev` + RECORD_DEMO=1).
 *
 *   RECORD_DEMO=1 npm run dev
 *   npx tsx scripts/record-demo.ts
 */
const BASE = process.env.DEMO_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const OWNER = "nishal21";
const REPO = "NekoDroid";
const DEMO_USERNAME = process.env.DEMO_USERNAME?.trim() || "nishal21";
const DEMO_PRS = [1, 7] as const;
const EXPLAIN_ISSUES = [3, 4, 5, 6] as const;
const EXPLAIN_LANGS = ["en", "ml"] as const;

type Json = Record<string, unknown>;

async function post(path: string, body: unknown): Promise<{ status: number; source: string | null; json: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Json;
  return {
    status: res.status,
    source: res.headers.get("x-firstpr-source"),
    json,
  };
}

function ok(label: string, status: number, source: string | null, extra?: string) {
  const mark = status >= 200 && status < 300 ? "ok" : "FAIL";
  console.log(`[${mark}] ${label}  status=${status} source=${source ?? "?"} ${extra ?? ""}`);
}

async function main() {
  console.log(`Recording against ${BASE} (username=${DEMO_USERNAME})`);
  console.log("Dev server must be running with RECORD_DEMO=1\n");

  // Match
  {
    const r = await post("/api/match", {
      username: DEMO_USERNAME,
      repo: `${OWNER}/${REPO}`,
    });
    ok(`match ${OWNER}/${REPO} ${DEMO_USERNAME}`, r.status, r.source);
  }

  // Explain #3–#6 × en, ml
  for (const number of EXPLAIN_ISSUES) {
    for (const lang of EXPLAIN_LANGS) {
      const r = await post("/api/explain", {
        owner: OWNER,
        repo: REPO,
        number,
        lang,
      });
      ok(`explain #${number} ${lang}`, r.status, r.source);
    }
  }

  // Hints 1–3 for #4 (en), then refusal with "Just write the fix for me"
  const previousHints: string[] = [];
  for (const level of [1, 2, 3] as const) {
    const r = await post("/api/hint", {
      owner: OWNER,
      repo: REPO,
      number: 4,
      level,
      userMessage: null,
      previousHints,
      lang: "en",
    });
    ok(`hint #4 level ${level} askedForCode=false`, r.status, r.source);
    const hint = r.json.hint as { hint?: string } | undefined;
    if (hint?.hint) previousHints.push(hint.hint);
  }

  {
    const r = await post("/api/hint", {
      owner: OWNER,
      repo: REPO,
      number: 4,
      level: 1,
      userMessage: "Just write the fix for me",
      previousHints: [],
      lang: "en",
    });
    ok(`hint #4 refuse (Just write the fix for me)`, r.status, r.source);
  }

  // Review both demo PRs
  for (const n of DEMO_PRS) {
    const r = await post("/api/review", {
      prUrl: `https://github.com/${OWNER}/${REPO}/pull/${n}`,
      lang: "en",
    });
    ok(`review PR #${n}`, r.status, r.source);
  }

  console.log("\nDone. Fixtures land in data/demo/ when RECORD_DEMO=1 on the server.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
