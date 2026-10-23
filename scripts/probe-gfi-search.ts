import { Octokit } from "@octokit/rest";
import { getEnv } from "../lib/env";

async function main() {
  const o = new Octokit({ auth: getEnv().GITHUB_TOKEN });
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() - 1);
  const since = oneYear.toISOString().slice(0, 10);
  const labels = [
    "good first issue",
    "good-first-issue",
    "beginner",
    "easy",
    "first-timers-only",
    "starter",
  ];
  const labelQ = labels.map((l) => `label:"${l}"`).join(" OR ");
  const q = `is:issue is:open repo:nishal21/NekoDroid no:assignee -linked:pr created:>${since} (${labelQ})`;
  console.log("q", q);
  const { data } = await o.search.issuesAndPullRequests({ q, per_page: 20 });
  console.log("count", data.total_count);
  for (const i of data.items) {
    console.log(
      "#" + i.number,
      i.title.slice(0, 55),
      i.labels.map((l) => (typeof l === "string" ? l : l.name)),
    );
  }

  // Graphify issue 3666
  const q2 = `is:issue repo:Graphify-Labs/graphify 3666`;
  const { data: d2 } = await o.search.issuesAndPullRequests({ q: q2, per_page: 5 });
  for (const i of d2.items) {
    console.log(
      "graphify",
      "#" + i.number,
      i.title.slice(0, 80),
      "created",
      i.created_at,
      "assignees",
      i.assignees?.length,
      "labels",
      i.labels.map((l) => (typeof l === "string" ? l : l.name)),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
