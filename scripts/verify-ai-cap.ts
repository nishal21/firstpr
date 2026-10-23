import { runChecks, splitDiffIntoFiles } from "../lib/checks";
import { AI_FAIL_SCORE_CAP, scoreChecks } from "../lib/score";
import { formatReviewMarkdown } from "../lib/review-format";

const diff = `diff --git a/src/foo.rs b/src/foo.rs
--- a/src/foo.rs
+++ b/src/foo.rs
@@ -1,0 +1,4 @@
+#[cfg(test)]
+mod tests {
+#[test]
+fn t() {}
+}
`;

const files = splitDiffIntoFiles(diff);
const checks = runChecks({
  pr: null,
  files,
  contributing: "## Checks\n```\ncargo test\n```",
  linkedIssue: null,
  pastedDiff: true,
  repoPaths: ["Cargo.toml", "src/foo.rs"],
});

const passContrib = scoreChecks(checks, {
  issueDoneWhenStatus: "fail",
  aiContributingStatus: "pass",
});
const warnContrib = scoreChecks(checks, {
  issueDoneWhenStatus: "fail",
  aiContributingStatus: "warn",
});

const foot = formatReviewMarkdown({
  summary: "x",
  checklist: [],
  line_comments: [],
  questions_a_maintainer_would_ask: [],
  encouragement: "ok",
  score: 58,
  verdict: "almost",
  checks: [],
});

console.log(
  JSON.stringify(
    {
      AI_FAIL_SCORE_CAP,
      passContrib,
      warnContrib,
      na: checks.filter((c) => c.status === "na").map((c) => c.id),
      footer: foot.trim().split("\n").at(-1),
    },
    null,
    2,
  ),
);
