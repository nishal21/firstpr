import { Octokit } from "@octokit/rest";
import { getEnv } from "../lib/env";

async function main() {
  const o = new Octokit({ auth: getEnv().GITHUB_TOKEN });
  const oneYear = new Date();
  oneYear.setFullYear(oneYear.getFullYear() - 1);
  const since = oneYear.toISOString().slice(0, 10);

  const queries = [
    `is:issue is:open repo:nishal21/NekoDroid label:"good first issue"`,
    `is:issue is:open repo:nishal21/NekoDroid no:assignee label:"good first issue"`,
    `is:issue is:open repo:nishal21/NekoDroid no:assignee -linked:pr label:"good first issue"`,
    `is:issue is:open repo:nishal21/NekoDroid no:assignee created:>${since} label:"good first issue"`,
  ];

  for (const q of queries) {
    const { data } = await o.search.issuesAndPullRequests({ q, per_page: 10 });
    console.log("---", data.total_count, q);
    for (const i of data.items.slice(0, 5)) {
      console.log("  #" + i.number, i.title.slice(0, 50));
    }
  }

  // listForRepo style
  const { data: listed } = await o.issues.listForRepo({
    owner: "nishal21",
    repo: "NekoDroid",
    state: "open",
    labels: "good first issue",
    per_page: 20,
  });
  console.log("listForRepo", listed.length);
  for (const i of listed) {
    if ("pull_request" in i && i.pull_request) continue;
    console.log(
      "  #" + i.number,
      "assignees",
      i.assignees?.length ?? 0,
      "created",
      i.created_at,
      i.title.slice(0, 40),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
