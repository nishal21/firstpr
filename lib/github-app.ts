import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import {
  BOT_CONFIG_PATH,
  DEFAULT_BOT_CONFIG,
  parseBotConfig,
  type BotConfig,
} from "@/lib/bot-config";
import {
  computeAutoLabels,
  formatLabelsBlock,
  replaceLabelsBlock,
} from "@/lib/auto-labels";
import { loadLabelFacts, syncAutoLabels } from "@/lib/auto-labels-github";
import { explainIssueCached } from "@/lib/explain";
import { getEnv } from "@/lib/env";
import {
  type GoodFirstIssue,
  type PullFile,
  type PullRequestInfo,
} from "@/lib/github";
import { getHint } from "@/lib/hints";
import { parseLinkedIssueNumbers } from "@/lib/linked-issues";
import { reviewPr } from "@/lib/review";
import {
  firstPrSiteOrigin,
  formatExplainWebhookComment,
  formatPrComment,
  formatPrCommentError,
  LEGACY_PR_COMMENT_PREFIXES,
  PR_COMMENT_MARKER,
} from "@/lib/webhook-format";

const MAX_PATCH_CHARS = 8000;
const MAX_TREE_PATHS = 20_000;

/** Author associations GitHub gives people with no merged work in the repo. */
const FIRST_TIME_ASSOCIATIONS = new Set([
  "FIRST_TIME_CONTRIBUTOR",
  "FIRST_TIMER",
  "NONE",
]);

type InstallationOctokit = InstanceType<typeof Octokit>;

let appInstance: App<{ Octokit: typeof Octokit }> | null = null;
let handlersRegistered = false;

function isBotSender(sender: { type?: string } | null | undefined): boolean {
  return sender?.type === "Bot";
}

function httpStatus(err: unknown): number | undefined {
  const s = (err as { status?: unknown })?.status;
  return typeof s === "number" ? s : undefined;
}

/** Read a text file through the installation token; null if it isn't there. */
async function readRepoFile(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      return null;
    }
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

async function loadBotConfig(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
): Promise<BotConfig> {
  // Default branch only, so a PR can't switch the bot off for itself.
  const text = await readRepoFile(octokit, owner, repo, BOT_CONFIG_PATH);
  return text ? parseBotConfig(text) : DEFAULT_BOT_CONFIG;
}

async function loadContributing(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  ref: string,
): Promise<string | null> {
  for (const path of ["CONTRIBUTING.md", ".github/CONTRIBUTING.md", "docs/CONTRIBUTING.md"]) {
    const text = await readRepoFile(octokit, owner, repo, path, ref);
    if (text !== null) return text;
  }
  return null;
}

async function loadRepoPaths(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<string[] | undefined> {
  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: "true",
    });
    return (data.tree ?? [])
      .filter((e) => e.type === "blob" && e.path)
      .map((e) => e.path as string)
      .slice(0, MAX_TREE_PATHS);
  } catch {
    return undefined;
  }
}

async function loadLinkedIssue(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  n: number | undefined,
): Promise<GoodFirstIssue | null> {
  if (!n) return null;
  try {
    const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: n });
    if (data.pull_request) return null; // `Fixes #N` pointing at another PR
    return {
      number: data.number,
      title: data.title,
      body: data.body ?? null,
      labels: data.labels
        .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
        .filter(Boolean),
      assignees: (data.assignees ?? []).map((a) => a.login),
      htmlUrl: data.html_url,
      createdAt: data.created_at,
      comments: data.comments,
      state: data.state === "closed" ? "closed" : "open",
    };
  } catch {
    return null;
  }
}

type PrBundle = {
  pr: PullRequestInfo;
  files: PullFile[];
  firstTimeContributor: boolean;
  draft: boolean;
};

/** Fresh PR + files via the installation Octokit (avoids GITHUB_TOKEN cache). */
async function loadPrBundle(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
): Promise<PrBundle> {
  const [{ data: prData }, filesData] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: number }),
    octokit.paginate(octokit.rest.pulls.listFiles, {
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
    linkedIssueNumbers: parseLinkedIssueNumbers(prData.body, owner, repo),
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

  return {
    pr,
    files,
    firstTimeContributor: FIRST_TIME_ASSOCIATIONS.has(prData.author_association),
    draft: Boolean(prData.draft),
  };
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

type ListedComment = {
  id: number;
  node_id: string;
  body?: string;
  user: { login: string; type?: string } | null;
  performed_via_github_app?: { id: number } | null;
};

function isOwnComment(c: ListedComment): boolean {
  const appId = Number(getEnv().GITHUB_APP_ID);
  if (c.performed_via_github_app && Number.isFinite(appId)) {
    return c.performed_via_github_app.id === appId;
  }
  return c.user?.type === "Bot" && /^firstpr/i.test(c.user.login);
}

/**
 * Create or edit the one FirstPRbot summary on a PR. Edits don't email
 * watchers, so new pushes stay quiet. Older score cards from before the
 * marker are collapsed as outdated when `minimize_old` is on.
 */
async function upsertPrComment(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
  body: string,
  config: BotConfig,
): Promise<void> {
  const comments = (await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: number,
    per_page: 100,
  })) as ListedComment[];

  const own = comments.filter(isOwnComment);
  const existing = own.find((c) => c.body?.includes(PR_COMMENT_MARKER));

  if (existing) {
    if (existing.body?.trim() !== body.trim()) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });
    }
  } else {
    await postComment(octokit, owner, repo, number, body);
  }

  if (!config.minimizeOld) return;
  const legacy = own.filter((c) =>
    LEGACY_PR_COMMENT_PREFIXES.some((p) => c.body?.trimStart().startsWith(p)),
  );
  for (const c of legacy) {
    try {
      await octokit.graphql(
        `mutation($id: ID!) { minimizeComment(input: { subjectId: $id, classifier: OUTDATED }) { clientMutationId } }`,
        { id: c.node_id },
      );
    } catch (err) {
      console.warn("[webhook] could not minimize old comment:", httpStatus(err) ?? err);
    }
  }
}

/** Add or drop the optional labels from `.github/firstpr.yml`. */
async function syncLabels(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
  config: BotConfig,
  state: { firstTimer: boolean; noIssue: boolean },
): Promise<void> {
  const add: string[] = [];
  if (config.labels.firstTimer && state.firstTimer) add.push(config.labels.firstTimer);
  if (config.labels.needsIssue && state.noIssue) add.push(config.labels.needsIssue);
  try {
    if (add.length > 0) {
      await octokit.rest.issues.addLabels({ owner, repo, issue_number: number, labels: add });
    }
    if (config.labels.needsIssue && !state.noIssue) {
      await octokit.rest.issues
        .removeLabel({ owner, repo, issue_number: number, name: config.labels.needsIssue })
        .catch((err) => {
          if (httpStatus(err) !== 404) throw err;
        });
    }
  } catch (err) {
    console.warn("[webhook] label sync failed:", httpStatus(err) ?? err);
  }
}

function ownAppId(): number | null {
  const id = Number(getEnv().GITHUB_APP_ID);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Set the fact-based `firstpr/` labels and return the comment's Labels
 * section. Null when auto labels are off or the facts couldn't be read;
 * label trouble never stops the summary comment.
 */
async function applyAutoLabels(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
  config: BotConfig,
  expectedSha?: string,
): Promise<string[] | null> {
  if (config.autoLabels.size === 0) return null;
  try {
    const loaded = await loadLabelFacts(octokit, owner, repo, number);
    if (!loaded.open) return null;
    if (expectedSha && loaded.facts.headSha !== expectedSha) return null;
    const result = computeAutoLabels(loaded.facts, config.autoLabels);
    const outcome = await syncAutoLabels(octokit, loaded, result, ownAppId());
    return formatLabelsBlock(result, outcome);
  } catch (err) {
    console.warn("[labels] skipped:", httpStatus(err) ?? (err as Error)?.message);
    return null;
  }
}

/** One check at a time per PR on this instance, so two pushes can't race. */
const prQueues = new Map<string, Promise<void>>();

function queueForPr(key: string, run: () => Promise<void>): Promise<void> {
  const prev = prQueues.get(key) ?? Promise.resolve();
  const next = prev.then(run, run).finally(() => {
    if (prQueues.get(key) === next) prQueues.delete(key);
  });
  prQueues.set(key, next);
  return next;
}

/**
 * Review a PR and keep its single summary comment up to date.
 * `requested` is true for `/firstpr review|recheck`, which also runs on
 * drafts and reports failures in the comment instead of only the logs.
 */
async function runPrCheck(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
  reason: string,
  requested: boolean,
): Promise<void> {
  return queueForPr(`${owner}/${repo}#${number}`, async () => {
    console.log(`[webhook] check PR ${owner}/${repo}#${number} (${reason})`);
    const config = await loadBotConfig(octokit, owner, repo);
    if (!config.enabled) {
      console.log(`[webhook] skip ${owner}/${repo}: disabled in ${BOT_CONFIG_PATH}`);
      return;
    }

    let prUrl = `https://github.com/${owner}/${repo}/pull/${number}`;
    try {
      const { pr, files, firstTimeContributor, draft } = await loadPrBundle(
        octokit,
        owner,
        repo,
        number,
      );
      prUrl = pr.htmlUrl;
      if (draft && !requested) {
        console.log(`[webhook] skip draft ${owner}/${repo}#${number}`);
        return;
      }

      const labelsBlock = await applyAutoLabels(octokit, owner, repo, number, config, pr.headSha);

      const [{ data: base }, linkedIssue] = await Promise.all([
        octokit.rest.repos.getBranch({ owner, repo, branch: pr.baseRef }),
        loadLinkedIssue(octokit, owner, repo, pr.linkedIssueNumbers[0]),
      ]);
      const baseSha = base.commit.sha;
      const [contributing, repoPaths] = await Promise.all([
        loadContributing(octokit, owner, repo, baseSha),
        loadRepoPaths(octokit, owner, repo, baseSha),
      ]);

      const result = await reviewPr({
        pr,
        files,
        contributing,
        linkedIssue,
        pastedDiff: false,
        owner,
        repo,
        prNumber: number,
        treeSha: baseSha,
        repoPaths: repoPaths ?? files.map((f) => f.filename),
      });

      // A newer push may have landed while the model was thinking; let its
      // own event write the comment instead of overwriting it with old news.
      const { data: latest } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: number,
      });
      if (latest.head.sha !== pr.headSha) {
        console.log(`[webhook] stale result for ${owner}/${repo}#${number}, skipping`);
        return;
      }

      const body = formatPrComment({
        owner,
        repo,
        number,
        prUrl: pr.htmlUrl,
        headSha: pr.headSha,
        author: pr.user,
        firstTimeContributor,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
        linkedIssueNumber: pr.linkedIssueNumbers[0] ?? null,
        linkedIssue,
        files,
        requireLinkedIssue: config.requireLinkedIssue,
        labelsBlock: labelsBlock ?? undefined,
        review: result,
      });

      await upsertPrComment(octokit, owner, repo, number, body, config);
      await syncLabels(octokit, owner, repo, number, config, {
        firstTimer: firstTimeContributor,
        noIssue: !linkedIssue,
      });
      console.log(`[webhook] updated summary on ${owner}/${repo}#${number}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] check failed:`, message);
      if (!requested) return;
      try {
        await upsertPrComment(
          octokit,
          owner,
          repo,
          number,
          formatPrCommentError(prUrl),
          config,
        );
      } catch (postErr) {
        console.error("[webhook] could not post error comment:", postErr);
      }
    }
  });
}

/**
 * Checks finished on a commit: refresh the labels and only the Labels
 * section of the existing summary. No new review, no new comment.
 */
async function refreshLabels(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  number: number,
  sha: string,
): Promise<void> {
  return queueForPr(`${owner}/${repo}#${number}`, async () => {
    const config = await loadBotConfig(octokit, owner, repo);
    if (!config.enabled || config.autoLabels.size === 0) return;
    const comments = (await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: number,
      per_page: 100,
    })) as ListedComment[];
    const existing = comments
      .filter(isOwnComment)
      .find((c) => c.body?.includes(PR_COMMENT_MARKER));
    // Only PRs FirstPRbot already summarised (so drafts stay untouched).
    if (!existing?.body || replaceLabelsBlock(existing.body, []) === null) return;

    const block = await applyAutoLabels(octokit, owner, repo, number, config, sha);
    if (!block) return;
    const next = replaceLabelsBlock(existing.body, block);
    if (next && next.trim() !== existing.body.trim()) {
      await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: next });
    }
    console.log(`[labels] refreshed ${owner}/${repo}#${number} for ${sha.slice(0, 7)}`);
  });
}

/** Open PRs whose head is `sha`. Fork PRs aren't in check payloads, so look. */
async function openPrsForSha(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<number[]> {
  const found: number[] = [];
  let pages = 0;
  for await (const page of octokit.paginate.iterator(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  })) {
    for (const pr of page.data) if (pr.head.sha === sha) found.push(pr.number);
    if (++pages >= 3) break;
  }
  return found;
}

async function refreshLabelsForSha(
  octokit: InstallationOctokit,
  owner: string,
  repo: string,
  sha: string,
  knownPrs: number[],
): Promise<void> {
  try {
    const numbers = knownPrs.length > 0 ? knownPrs : await openPrsForSha(octokit, owner, repo, sha);
    for (const n of [...new Set(numbers)]) await refreshLabels(octokit, owner, repo, n, sha);
  } catch (err) {
    console.warn("[labels] refresh failed:", httpStatus(err) ?? (err as Error)?.message);
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

    const command = (payload.comment.body ?? "").trimStart().split(/\s/, 2).join(" ").toLowerCase();
    const isExplain = command === "/firstpr explain";
    const isReview = command === "/firstpr review" || command === "/firstpr recheck";
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
            "`/firstpr recheck` works on pull requests. On an issue, try `/firstpr explain` for a guide to where the fix goes.",
            "",
            "<sub>FirstPRbot</sub>",
          ].join("\n"),
        );
        return;
      }
      await runPrCheck(octokit, owner, repo, number, command, true);
      return;
    }

    // /firstpr explain
    if (onPr) {
      // The PR already has (or is about to get) its summary; just refresh it.
      console.log(`[webhook] /firstpr explain on PR ${owner}/${repo}#${number}, rechecking`);
      await runPrCheck(octokit, owner, repo, number, command, true);
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
            "FirstPRbot couldn't finish the guide for this issue. GitHub or the model didn't answer in time.",
            "",
            "Comment `/firstpr explain` again in a minute, or open the guide on the site: " +
              `${firstPrSiteOrigin()}/issue/${owner}/${repo}/${number}`,
            "",
            "<sub>FirstPRbot</sub>",
          ].join("\n"),
        );
      } catch (postErr) {
        console.error("[webhook] could not post error comment:", postErr);
      }
    }
  });

  app.webhooks.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
      "pull_request.ready_for_review",
      "pull_request.edited",
    ],
    async ({ octokit, payload }) => {
      if (isBotSender(payload.sender)) {
        console.log("[webhook] skip pull_request: sender is Bot");
        return;
      }
      // Title-only edits don't change anything the summary shows.
      if (payload.action === "edited" && !("body" in (payload.changes ?? {}))) {
        return;
      }
      if (payload.pull_request.state !== "open") return;

      await runPrCheck(
        octokit,
        payload.repository.owner.login,
        payload.repository.name,
        payload.pull_request.number,
        `pull_request.${payload.action}`,
        false,
      );
    },
  );

  // Needs the App subscribed to "Check suite" and "Status" events, and
  // Checks: read. Without them labels still update on every push.
  app.webhooks.on("check_suite.completed", async ({ octokit, payload }) => {
    const repoId = payload.repository.id;
    const prs = (payload.check_suite.pull_requests ?? [])
      .filter((p) => p.base?.repo?.id === repoId)
      .map((p) => p.number);
    await refreshLabelsForSha(
      octokit,
      payload.repository.owner.login,
      payload.repository.name,
      payload.check_suite.head_sha,
      prs,
    );
  });

  app.webhooks.on("status", async ({ octokit, payload }) => {
    if (payload.state === "pending") return;
    await refreshLabelsForSha(
      octokit,
      payload.repository.owner.login,
      payload.repository.name,
      payload.sha,
      [],
    );
  });

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
