/**
 * Verify hint ladder + refusal for NekoDroid #4.
 * npx tsx --env-file=.env scripts/verify-hints.ts
 */
import { getHint, hintContainsCode } from "../lib/hints";

async function main() {
  const refuse = await getHint({
    owner: "nishal21",
    repo: "NekoDroid",
    number: 4,
    level: 1,
    userMessage: "Just write the fix for me",
    previousHints: [],
  });

  const level2 = await getHint({
    owner: "nishal21",
    repo: "NekoDroid",
    number: 4,
    level: 2,
    userMessage: null,
    previousHints: [refuse.hint.hint],
  });

  const level3 = await getHint({
    owner: "nishal21",
    repo: "NekoDroid",
    number: 4,
    level: 3,
    userMessage: null,
    previousHints: [refuse.hint.hint, level2.hint.hint],
  });

  const pointsMain = refuse.points.some((p) => p.path === "src/main.ts");
  const level3Code = hintContainsCode(level3.hint);
  const level3Ts = /\b(TypeScript|const |let |=>|function |addLog\()/i.test(
    [level3.hint.hint, ...(level3.hint.pseudocode ?? [])].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        refuse: {
          askedForCode: refuse.askedForCode,
          refused: refuse.hint.refused,
          refusal: refuse.hint.refusal_message,
          hint: refuse.hint.hint,
          points: refuse.points.map((p) => `${p.path}:${p.start_line}-${p.end_line}`),
        },
        level2: { hint: level2.hint.hint },
        level3: {
          hint: level3.hint.hint,
          pseudocode: level3.hint.pseudocode,
          codeDetected: level3Code,
          looksLikeTs: level3Ts,
        },
        ok:
          refuse.askedForCode &&
          refuse.hint.refused &&
          Boolean(refuse.hint.refusal_message) &&
          pointsMain &&
          !level3Code &&
          !level3Ts,
      },
      null,
      2,
    ),
  );

  if (
    !(
      refuse.askedForCode &&
      refuse.hint.refused &&
      refuse.hint.refusal_message &&
      pointsMain &&
      !level3Code &&
      !level3Ts
    )
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
