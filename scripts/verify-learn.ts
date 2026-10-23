/**
 * Check Learn-this-first relevance for NekoDroid #4 and #6.
 * npx tsx --env-file=.env scripts/verify-learn.ts
 */
import { explainIssue } from "../lib/explain";

async function check(number: number) {
  const result = await explainIssue({
    owner: "nishal21",
    repo: "NekoDroid",
    number,
  });
  const sites = (result.learn ?? []).map((l) => l.site);
  const titles = (result.learn ?? []).map((l) => l.title);
  console.log(
    JSON.stringify(
      {
        number,
        language: result.language,
        concepts: result.explanation.concepts.map((c) => c.term),
        learnCount: result.learn?.length ?? 0,
        sites,
        titles,
      },
      null,
      2,
    ),
  );
  return result;
}

async function main() {
  const six = await check(6);
  const four = await check(4);

  const sixOk =
    (six.learn?.length ?? 0) >= 2 &&
    (six.learn ?? []).some(
      (l) =>
        /rust/i.test(`${l.title} ${l.snippet}`) ||
        /doc\.rust-lang\.org|rust-lang\.github\.io/i.test(l.link),
    );

  const fourOk =
    (four.learn?.length ?? 0) >= 2 &&
    (four.learn ?? []).some((l) =>
      /developer\.mozilla\.org|mdn/i.test(`${l.link} ${l.site}`),
    );

  console.log(JSON.stringify({ sixOk, fourOk, ok: sixOk && fourOk }));
  if (!(sixOk && fourOk)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
