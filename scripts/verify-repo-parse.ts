import { parseRepo } from "../lib/github";
import { matchIssues } from "../lib/match";

const parseCases = [
  "NekoDroid",
  "nishal21/NekoDroid",
  "https://github.com/nishal21/NekoDroid",
  "https://github.com/nishal21/NekoDroid.git",
  "https://github.com/nishal21/NekoDroid/",
  "  nishal21/NekoDroid  ",
];

for (const c of parseCases) {
  try {
    const p =
      c.includes("/") || /github/i.test(c)
        ? parseRepo(c)
        : parseRepo(c, { defaultOwner: "anyone" });
    console.log("parse", JSON.stringify(c), "->", p);
  } catch (e) {
    console.log("parse fail", c, e instanceof Error ? e.message : e);
  }
}

async function main() {
  for (const repo of [
    "NekoDroid",
    "nishal21/NekoDroid",
    "https://github.com/nishal21/NekoDroid",
  ]) {
    const r = await matchIssues({ username: "octocat", repo });
    console.log(
      "match",
      repo,
      "->",
      r.picked
        ? `#${r.picked.number} ${r.picked.owner}/${r.picked.repo}`
        : "none",
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
