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

async function postComment(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  issue_number: number,
  body: string,
): Promise<void> {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number,
    body,
  });
}

/** Run mentor-ready review and post one score-card comment (no line comments). */
async function postPrReviewComment(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
  reason: string,
): Promise<void> {
  console.log(`[webhook] review PR ${owner}/${repo}#${number} (${reason})`);

  try {
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

    const body = formatReviewMarkdown({
      ...result,
      line_comments: [],
    });

    const site = `https://firstpr-coral.vercel.app/review`;
    const withFooter = [
      body,
      "",
      "---",
      `_Triggered by ${reason}. Re-run anytime with_ \`/firstpr review\`.`,
      `_Full Review UI:_ ${site}`,
    ].join("\n");

    await postComment(octokit, owner, repo, number, withFooter);
    console.log(`[webhook] posted review on ${owner}/${repo}#${number}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] review failed:`, message);
    try {
      await postComment(
        octokit,
        owner,
        repo,
        number,
        [
          "FirstPR hit an error while reviewing this PR.",
          "",
          `\`\`\`\n${message.slice(0, 500)}\n\`\`\``,
          "",
          "Try again with `/firstpr review` on this PR.",
        ].join("\n"),
      );
    } catch (postErr) {
      console.error("[webhook] could not post error comment:", postErr);
    }
  }
}

function registerHandlers(app: App<{ Octokit: typeof Octokit }>): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  app.webhooks.on("issue_comment.created", async ({ octokit, payload }) => {
    if (isBotSender(payload.sender)) {
      console.log("[webhook] skip issue_comment: sender is Bot");
      return;
    }

    const commentBody = (payload.comment.body ?? "").trimStart();
    const isExplain = commentBody.startsWith("/firstpr explain");
    const isReview = commentBody.startsWith("/firstpr review");
    if (!isExplain && !isReview) {
      console.log("[webhook] skip issue_comment: not a /firstpr command");
      return;
    }

    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const number = payload.issue.number;
    const onPr = Boolean(payload.issue.pull_request);

    if (isReview) {
      if (!onPr) {
        await postComment(
          octokit,
          owner,
          repo,
          number,
          [
            "FirstPR **review** runs on **pull requests**, not issues.",
            "",
            "On a PR comment:",
            "```",
            "/firstpr review",
            "```",
            "",
            "For an issue guide, use `/firstpr explain` instead.",
          ].join("\n"),
        );
        return;
      }
      await postPrReviewComment(
        octokit,
        owner,
        repo,
        number,
        "`/firstpr review`",
      );
      return;
    }

    // /firstpr explain
    if (onPr) {
      console.log(
        `[webhook] /firstpr explain on PR ${owner}/${repo}#${number} — tip`,
      );
      await postComment(
        octokit,
        owner,
        repo,
        number,
        [
          "FirstPR **explain** only works on **issues**.",
          "",
          "For a mentor-ready score card on this PR, comment:",
          "```",
          "/firstpr review",
          "```",
          "",
          `For an issue guide, open an issue and comment \`/firstpr explain\` (example: [#5](https://github.com/${owner}/${repo}/issues/5)).`,
        ].join("\n"),
      );
      return;
    }

    console.log(`[webhook] /firstpr explain on ${owner}/${repo}#${number}`);

    try {
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

      await postComment(octokit, owner, repo, number, body);
      console.log(`[webhook] posted explain on ${owner}/${repo}#${number}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] explain failed:`, message);
      try {
        await postComment(
          octokit,
          owner,
          repo,
          number,
          [
            "FirstPR hit an error while explaining this issue.",
            "",
            `\`\`\`\n${message.slice(0, 500)}\n\`\`\``,
            "",
            "_Check Vercel logs for `[webhook]` / OpenAI / GitHub App permissions (Issues: Read & write)._",
          ].join("\n"),
        );
      } catch (postErr) {
        console.error("[webhook] could not post error comment:", postErr);
      }
    }
  });

  app.webhooks.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async ({ octokit, payload }) => {
      if (isBotSender(payload.sender)) {
        console.log("[webhook] skip pull_request: sender is Bot");
        return;
      }

      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const number = payload.pull_request.number;

      await postPrReviewComment(
        octokit,
        owner,
        repo,
        number,
        `pull_request.${payload.action}`,
      );
    },
  );

  app.webhooks.onError((error) => {
    console.error("[webhook] handler error:", error);
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

  // Vercel / .env often store PEMs as one line with \n, or wrap in quotes.
  const normalizedKey = privateKey
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  const keyLines = normalizedKey
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (
    keyLines.length < 3 ||
    !keyLines[0].includes("BEGIN") ||
    !keyLines[keyLines.length - 1].includes("END")
  ) {
    throw new Error(
      "GITHUB_APP_PRIVATE_KEY is truncated (often only the BEGIN line on Vercel). " +
        "Paste the full .pem as one line with \\n between lines, then redeploy.",
    );
  }

  appInstance = new App({
    appId,
    privateKey: normalizedKey,
    webhooks: { secret },
    Octokit,
  });

  registerHandlers(appInstance);
  return appInstance;
}
