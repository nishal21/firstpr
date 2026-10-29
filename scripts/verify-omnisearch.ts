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

const react = parseOmniQuery("react");
if (react.length < 2 || react[1]?.flow !== "match-user") {
  console.error("react should also offer the username flow");
  failed += 1;
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("omnisearch ok", cases.length);
