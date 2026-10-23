/**
 * npx tsx --env-file=.env scripts/verify-review.ts
 */
import {
  getBranchSha,
  getContributing,
  getIssue,
  getPullFiles,
  getPullRequest,
  parsePrUrl,
} from "../lib/github";
import { reviewPr } from "../lib/review";

async function main() {
  const prUrl =
    process.argv[2] ?? "https://github.com/nishal21/NekoDroid/pull/7";
  const { owner, repo, number } = parsePrUrl(prUrl);
  console.log(`[review] fetching ${owner}/${repo}#${number}`);

  const [pr, files] = await Promise.all([
    getPullRequest(owner, repo, number),
    getPullFiles(owner, repo, number),
  ]);

  let contributing: string | null = null;
  try {
    const baseSha = await getBranchSha(owner, repo, pr.baseRef);
    contributing = await getContributing(owner, repo, baseSha);
  } catch {
    contributing = null;
  }

  let linkedIssue = null;
  if (pr.linkedIssueNumbers[0]) {
    try {
      linkedIssue = await getIssue(owner, repo, pr.linkedIssueNumbers[0]);
    } catch {
      linkedIssue = null;
    }
  }

  console.log("[review] calling model…");
  const result = await reviewPr({
    pr,
    files,
    contributing,
    linkedIssue,
    owner,
    repo,
    prNumber: number,
    lang: "Rust",
  });

  console.log(
    JSON.stringify(
      {
        score: result.score,
        verdict: result.verdict,
        summary: result.summary,
        checklistCount: result.checklist.length,
        checklist: result.checklist.map((c) => ({
          id: c.id,
          status: c.status,
          source: c.source,
          hasFix: Boolean(c.fix),
          label: c.label,
        })),
        line_comments: result.line_comments.length,
        questions: result.questions_a_maintainer_would_ask.length,
        encouragement: result.encouragement,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
