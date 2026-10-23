import {
  expectedCheckCommands,
  inferCheckCommands,
  runChecks,
} from "../lib/checks";
import {
  getBranchSha,
  getContributing,
  getPullFiles,
  getPullRequest,
  getTree,
  parsePrUrl,
} from "../lib/github";
import { formatReviewMarkdown } from "../lib/review-format";

async function main() {
  const md = `## Checks
\`\`\`bash
cargo test --lib
npm run build:wasm
npm run build
pytest
\`\`\``;

  console.log(
    JSON.stringify(
      {
        both: expectedCheckCommands(md, [
          "Cargo.toml",
          "package.json",
          "src/main.rs",
        ]),
        rustOnly: expectedCheckCommands(md, ["Cargo.toml", "src/lib.rs"]),
        fallback: expectedCheckCommands(null, ["Cargo.toml", "package.json"]),
        inferGo: inferCheckCommands(["go.mod"]),
      },
      null,
      2,
    ),
  );

  const { owner, repo, number } = parsePrUrl(
    "https://github.com/nishal21/NekoDroid/pull/7",
  );
  const [pr, files] = await Promise.all([
    getPullRequest(owner, repo, number),
    getPullFiles(owner, repo, number),
  ]);
  const baseSha = await getBranchSha(owner, repo, pr.baseRef);
  const contributing = await getContributing(owner, repo, baseSha);
  const repoPaths = await getTree(owner, repo, baseSha);
  const checks = runChecks({
    pr,
    files,
    contributing,
    linkedIssue: null,
    pastedDiff: false,
    repoPaths,
  });
  console.log("PR7 evidence:", JSON.stringify(checks.find((c) => c.id === "check_evidence")));

  const foot = formatReviewMarkdown({
    summary: "x",
    checklist: [],
    line_comments: [],
    questions_a_maintainer_would_ask: [],
    encouragement: "nice",
    score: 70,
    verdict: "almost",
    checks: [],
  });
  console.log("footer:", foot.trim().split("\n").at(-1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
