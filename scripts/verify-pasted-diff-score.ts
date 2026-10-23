import { runChecks, splitDiffIntoFiles } from "../lib/checks";
import { PASTED_DIFF_SUMMARY, scoreChecks, verdictFromChecklist } from "../lib/score";

const sampleDiff = `diff --git a/src/android/apk.rs b/src/android/apk.rs
index 111..222 100644
--- a/src/android/apk.rs
+++ b/src/android/apk.rs
@@ -10,0 +11,3 @@
+#[cfg(test)]
+mod tests {
+#[test]
+fn it_works() {}
+}
`;

async function main() {
  const files = splitDiffIntoFiles(sampleDiff);
  const checks = runChecks({
    pr: null,
    files,
    contributing: "## Checks\n```bash\ncargo test\n```\n",
    linkedIssue: null,
    pastedDiff: true,
    repoPaths: ["Cargo.toml", "src/android/apk.rs"],
  });

  const prOnly = ["linked_issue", "branch_name", "description", "check_evidence"];
  for (const id of prOnly) {
    const c = checks.find((x) => x.id === id);
    console.log(id, c?.status, c?.evidence);
  }

  const { score } = scoreChecks(checks, {
    issueDoneWhenStatus: "pass",
    aiContributingStatus: "pass",
  });

  // Applicable: issue_done_when 30, contributing (forbidden+ai, no branch) 20,
  // tests 5, scope 5 → all pass → 100
  const checklist = [
    ...checks.map((c) => ({ status: c.status })),
    { status: "pass" as const },
    { status: "pass" as const },
  ];
  console.log(
    JSON.stringify(
      {
        score,
        verdict: verdictFromChecklist(checklist),
        summary: PASTED_DIFF_SUMMARY,
        tests: checks.find((c) => c.id === "tests_touched"),
        scoredIds: checks
          .filter((c) => c.status !== "na")
          .map((c) => c.id),
      },
      null,
      2,
    ),
  );

  // With warn on tests only among scored rule items
  const { score: scoreWarn } = scoreChecks(
    checks.map((c) =>
      c.id === "tests_touched" ? { ...c, status: "warn" as const } : c,
    ),
    { issueDoneWhenStatus: "pass", aiContributingStatus: "pass" },
  );
  // weights: 30+20+5+5=60; earned: 30+20+2.5+5=57.5 → 96
  console.log("score with tests warn:", scoreWarn);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
