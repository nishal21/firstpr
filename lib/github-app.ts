import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import { explainIssueCached } from "@/lib/explain";
import { getEnv } from "@/lib/env";
import {
  getBranchSha,
  getContributing,
  getIssue,
  type GoodFirstIssue,
  type PullFile,
  type PullRequestInfo,
} from "@/lib/github";
import { getHint } from "@/lib/hints";
import { formatReviewMarkdown, reviewPr } from "@/lib/review";
import { formatExplainWebhookComment } from "@/lib/webhook-format";

const CLOSE_KEYWORD_RE =
  /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;

const MAX_PATCH_CHARS = 8000;

type InstallationOctokit = InstanceType<typeof Octokit>;

let appInstance: App<{ Octokit: typeof Octokit }> | null = null;
let handlersRegistered = false;

function parseLinkedIssueNumbers(body: string | null): number[] {
  if (!body) return [];
  const nums = new Set<number>();
  CLOSE_KEYWORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLOSE_KEYWORD_RE.exec(body)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) nums.add(n);
  }
  return [...nums];
}

function isBotSender(sender: { type?: string } | null | undefined): boolean {
  return sender?.type === "Bot";
}

async function loadLinkedIssue(
  owner: string,
  repo: string,
  pr: PullRequestInfo,
): Promise<GoodFirstIssue | null> {
  const n = pr.linkedIssueNumbers[0];
  if (!n) return null;
  try {
    return await getIssue(owner, repo, n);
  } catch {
    return null;
  }
}

/** Fresh PR + files via the installation Octokit (avoids GITHUB_TOKEN cache). */
async function loadPrBundle(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
): Promise<{ pr: PullRequestInfo; files: PullFile[] }> {
  const [{ data: prData }, { data: filesData }] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: number }),
    octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    }),
  ]);

  const pr: PullRequestInfo = {
    title: prData.title,
    body: prData.body ?? null,
    headRef: prData.head.ref,
    baseRef: prData.base.ref,
    user: prData.user?.login ?? null,
    additions: prData.additions,
    deletions: prData.deletions,
    changedFiles: prData.changed_files,
    htmlUrl: prData.html_url,
    headSha: prData.head.sha,
    linkedIssueNumbers: parseLinkedIssueNumbers(prData.body),
  };

  const files: PullFile[] = filesData.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch
      ? file.patch.length > MAX_PATCH_CHARS
        ? file.patch.slice(0, MAX_PATCH_CHARS)
        : file.patch
      : null,
  }));

  return { pr, files };
}

function registerHandlers(app: App<{ Octokit: typeof Octokit }>): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  app.webhooks.on("issue_comment.created", async ({ octokit, payload }) => {
    if (isBotSender(payload.sender)) return;
    if (payload.issue.pull_request) return;

    const commentBody = payload.comment.body ?? "";
    if (!commentBody.trimStart().startsWith("/firstpr explain")) return;

    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const number = payload.issue.number;

    console.log(`[webhook] /firstpr explain on ${owner}/${repo}#${number}`);

    const explained = await explainIssueCached({ owner, repo, number });
    const hintResult = await getHint({
      owner,
      repo,
      number,
      level: 1,
    });

    const body = formatExplainWebhookComment(
      explained,
      hintResult.hint.hint,
    );

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });
  });

  app.webhooks.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async ({ octokit, payload }) => {
      if (isBotSender(payload.sender)) return;

      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const number = payload.pull_request.number;

      console.log(
        `[webhook] review PR ${owner}/${repo}#${number} (${payload.action})`,
      );

      const { pr, files } = await loadPrBundle(octokit, owner, repo, number);

      let contributing: string | null = null;
      let treeSha: string | undefined;
      try {
        const baseSha = await getBranchSha(owner, repo, pr.baseRef);
        treeSha = baseSha;
        contributing = await getContributing(owner, repo, baseSha);
      } catch {
        contributing = null;
        treeSha = pr.headSha;
      }

      const linkedIssue = await loadLinkedIssue(owner, repo, pr);

      const result = await reviewPr({
        pr,
        files,
        contributing,
        linkedIssue,
        pastedDiff: false,
        owner,
        repo,
        prNumber: number,
        treeSha,
      });

      // Score-card comment only — no GitHub review line comments.
      const body = formatReviewMarkdown({
        ...result,
        line_comments: [],
      });

      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: number,
        body,
      });
    },
  );

  app.webhooks.onError((error) => {
    console.error("[webhook]", error.message);
  });
}

/** GitHub App with webhook handlers. Throws if App env vars are missing. */
export function getGitHubApp(): App<{ Octokit: typeof Octokit }> {
  if (appInstance) return appInstance;

  const env = getEnv();
  const appId = env.GITHUB_APP_ID;
  const privateKey = env.GITHUB_APP_PRIVATE_KEY;
  const secret = env.GITHUB_WEBHOOK_SECRET;

  if (!appId || !privateKey || !secret) {
    throw new Error(
      "GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and GITHUB_WEBHOOK_SECRET are required",
    );
  }

  appInstance = new App({
    appId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    webhooks: { secret },
    Octokit,
  });

  registerHandlers(appInstance);
  return appInstance;
}
