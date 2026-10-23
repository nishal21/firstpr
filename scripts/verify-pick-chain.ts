/**
 * Verify Gemma → Qwen → OpenAI pickFiles chain.
 * Run from firstpr/: npx tsx --env-file=.env scripts/verify-pick-chain.ts
 */
import { getTree, getRepo, getIssue } from "../lib/github";
import { pickFiles } from "../lib/neysa";

async function runOnce(label: string) {
  const owner = "nishal21";
  const repo = "NekoDroid";
  const issueNumber = 4;
  const repoInfo = await getRepo(owner, repo);
  const issue = await getIssue(owner, repo, issueNumber);
  const paths = await getTree(owner, repo, repoInfo.headSha);
  const started = Date.now();
  const result = await pickFiles(issue.title, issue.body ?? "", paths, {
    owner,
    repo,
    sha: repoInfo.headSha,
  });
  console.log(
    `[${label}] source=${result.source} files=${JSON.stringify(result.files)} ms=${Date.now() - started}`,
  );
  return result.source;
}

async function main() {
  const withKeys = await runOnce("with-neysa-keys");

  for (const k of [
    "NEYSA_GEMMA_KEY",
    "NEYSA_GEMMA_URL",
    "NEYSA_GEMMA_MODEL",
    "NEYSA_QWEN_KEY",
    "NEYSA_QWEN_URL",
    "NEYSA_QWEN_MODEL",
  ]) {
    delete process.env[k];
  }

  const withoutKeys = await runOnce("neysa-keys-removed");

  console.log(
    JSON.stringify({
      withKeys,
      withoutKeys,
      ok:
        (withKeys === "qwen" || withKeys === "gemma") &&
        withoutKeys === "openai",
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
