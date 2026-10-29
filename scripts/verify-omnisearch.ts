import { parseOmniQuery } from "../lib/omnisearch";

function first(q: string) {
  return parseOmniQuery(q)[0];
}

const cases: Array<[string, string | undefined, string]> = [
  ["python", "match-topic", "Python"],
  ["react", "match-topic", undefined],
  ["easy python docs issue", "match-topic", "Python"],
  ["https://github.com/nishal21/NekoDroid/issues/4", "explain", "4"],
  ["https://github.com/nishal21/NekoDroid/pull/7", "review", "7"],
  ["https://github.com/nishal21/NekoDroid", "readiness", "NekoDroid"],
  ["nishal21/NekoDroid", "readiness", "NekoDroid"],
  ["nishal21", "match-user", "nishal21"],
  ["@octocat", "match-user", "octocat"],
  ["@docs", "match-user", "docs"],
  ["docs", "match-topic", undefined],
  ["python", "match-topic", "Python"],
  ["javascript", "match-topic", "JavaScript"],
  ["", undefined, ""],
];

let failed = 0;
for (const [query, flow, extra] of cases) {
  const item = first(query);
  const got = item?.flow;
  if (got !== flow) {
    console.error("flow", JSON.stringify(query), "expected", flow, "got", got);
    failed += 1;
    continue;
  }
  if (!item) continue;
  if (item.flow === "match-topic" && extra && item.language !== extra) {
    console.error("lang", query, item.language, "expected", extra);
    failed += 1;
  }
  if (item.flow === "explain" && String(item.number) !== extra) failed += 1;
  if (item.flow === "review" && String(item.number) !== extra) failed += 1;
  if (item.flow === "readiness" && item.repo !== extra) failed += 1;
  if (item.flow === "match-user" && item.username !== extra) failed += 1;
}

for (const word of ["react", "docs", "python", "javascript"]) {
  const flows = parseOmniQuery(word);
  if (flows.some((item) => item.flow === "match-user")) {
    console.error(word, "should not offer Match for a language or chip word");
    failed += 1;
  }
  if (flows[0]?.flow !== "match-topic") {
    console.error(word, "should lead with Find beginner issues");
    failed += 1;
  }
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("omnisearch ok", cases.length);
