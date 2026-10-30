/**
 * GitHub reads and writes for FirstPRbot's fact-based labels.
 * Reads go through whatever Octokit it's given; only `syncAutoLabels` writes.
 */
import type { Octokit } from "@octokit/rest";
import {
  autoLabelDef,
  isAutoLabelName,
  planLabelSync,
  type AutoLabelResult,
  type ChecksFact,
  type ClosingFact,
  type LabelEvent,
  type LabelFacts,
  type LabelSyncOutcome,
} from "./auto-labels.ts";

type Kit = InstanceType<typeof Octokit>;

function httpStatus(err: unknown): number | undefined {
  const s = (err as { status?: unknown })?.status;
  return typeof s === "number" ? s : undefined;
}

const CLOSING_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef { name }
    pullRequest(number: $number) {
      baseRefName
      closingIssuesReferences(first: 10) {
        totalCount
        nodes { number url repository { nameWithOwner } }
      }
    }
  }
}`;

type ClosingResponse = {
  repository: {
    defaultBranchRef: { name: string } | null;
    pullRequest: {
      baseRefName: string;
      closingIssuesReferences: {
        totalCount: number;
        nodes: ({ number: number; url: string; repository: { nameWithOwner: string } } | null)[];
      };
    } | null;
  } | null;
};

export async function loadClosing(kit: Kit, owner: string, repo: string, number: number): Promise<ClosingFact> {
  try {
    const data = await kit.graphql<ClosingResponse>(CLOSING_QUERY, { owner, repo, number });
    const pr = data.repository?.pullRequest;
    const defaultBranch = data.repository?.defaultBranchRef?.name;
    if (!pr || !defaultBranch) return { ok: false };
    const refs = pr.closingIssuesReferences;
    return {
      ok: true,
      baseRef: pr.baseRefName,
      defaultBranch,
      totalCount: refs.totalCount,
      issues: refs.nodes
        .filter((n): n is NonNullable<typeof n> => !!n)
        .map((n) => ({ number: n.number, url: n.url, repo: n.repository.nameWithOwner })),
    };
  } catch (err) {
    console.warn("[labels] closing issues read failed:", httpStatus(err) ?? (err as Error)?.message);
    return { ok: false };
  }
}

async function loadChecks(kit: Kit, owner: string, repo: string, ref: string): Promise<ChecksFact> {
  try {
    const [runs, suites, combined] = await Promise.all([
      kit.paginate(kit.rest.checks.listForRef, { owner, repo, ref, filter: "latest", per_page: 100 }),
      kit.paginate(kit.rest.checks.listSuitesForRef, { owner, repo, ref, per_page: 100 }),
      kit.rest.repos.getCombinedStatusForRef({ owner, repo, ref, per_page: 100 }),
    ]);
    // More statuses than one page means we can't see them all.
    if (combined.data.total_count > combined.data.statuses.length) return { ok: false, reason: "error" };
    return {
      ok: true,
      runs: runs.map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion ?? null })),
      statuses: combined.data.statuses.map((s) => ({ context: s.context, state: s.state })),
      suites: suites.map((s) => ({
        app: s.app?.slug ?? null,
        status: s.status ?? null,
        conclusion: s.conclusion ?? null,
        runCount: s.latest_check_runs_count ?? 0,
      })),
    };
  } catch (err) {
    const status = httpStatus(err);
    console.warn("[labels] checks read failed:", status ?? (err as Error)?.message);
    return { ok: false, reason: status === 403 || status === 404 ? "no_access" : "error" };
  }
}

export type LoadedLabelPr = {
  facts: LabelFacts;
  labels: string[];
  draft: boolean;
  open: boolean;
};

/** Everything the label rules need, read-only. */
export async function loadLabelFacts(kit: Kit, owner: string, repo: string, number: number): Promise<LoadedLabelPr> {
  const { data: pr } = await kit.rest.pulls.get({ owner, repo, pull_number: number });
  const files = await kit.paginate(kit.rest.pulls.listFiles, { owner, repo, pull_number: number, per_page: 100 });
  const [closing, checks] = await Promise.all([
    loadClosing(kit, owner, repo, number),
    loadChecks(kit, owner, repo, pr.head.sha),
  ]);
  return {
    facts: {
      owner,
      repo,
      number,
      prUrl: pr.html_url,
      headSha: pr.head.sha,
      author: pr.user?.login ?? null,
      authorAssociation: pr.author_association ?? null,
      body: pr.body ?? null,
      files: files.map((f) => ({
        filename: f.filename,
        previousFilename: f.previous_filename ?? null,
        additions: f.additions,
        deletions: f.deletions,
      })),
      changedFiles: pr.changed_files,
      closing,
      checks,
    },
    labels: pr.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean),
    draft: !!pr.draft,
    open: pr.state === "open",
  };
}

/** Label added/removed events for FirstPRbot labels, oldest first. */
export async function loadLabelEvents(
  kit: Kit,
  owner: string,
  repo: string,
  number: number,
  appId: number | null,
): Promise<LabelEvent[]> {
  const events = await kit.paginate(kit.rest.issues.listEvents, { owner, repo, issue_number: number, per_page: 100 });
  const out: LabelEvent[] = [];
  for (const e of events) {
    if (e.event !== "labeled" && e.event !== "unlabeled") continue;
    const name = (e as { label?: { name?: string } }).label?.name;
    if (!name || !isAutoLabelName(name)) continue;
    const viaApp = (e as { performed_via_github_app?: { id?: number } | null }).performed_via_github_app?.id;
    const actor = e.actor as { login?: string; type?: string } | null | undefined;
    const byBot =
      (appId !== null && viaApp === appId) ||
      (actor?.type === "Bot" && /^firstpr/i.test(actor.login ?? ""));
    out.push({ event: e.event, label: name, byBot });
  }
  return out;
}

/**
 * Bring the PR's `firstpr/` labels in line with the facts. Never throws;
 * any GitHub refusal becomes `{ status: "failed" }`.
 */
export async function syncAutoLabels(
  kit: Kit,
  loaded: LoadedLabelPr,
  result: AutoLabelResult,
  appId: number | null,
): Promise<LabelSyncOutcome> {
  const { owner, repo, number } = loaded.facts;
  try {
    const events = await loadLabelEvents(kit, owner, repo, number, appId);
    const plan = planLabelSync({
      current: loaded.labels,
      desired: result.labels.map((l) => l.def.name),
      events,
    });
    for (const name of plan.add) {
      const def = autoLabelDef(name)!;
      try {
        await kit.rest.issues.createLabel({ owner, repo, name: def.name, color: def.color, description: def.description });
      } catch (err) {
        if (httpStatus(err) !== 422) throw err; // 422: it already exists
      }
    }
    if (plan.add.length > 0) {
      await kit.rest.issues.addLabels({ owner, repo, issue_number: number, labels: plan.add });
    }
    for (const name of plan.remove) {
      await kit.rest.issues.removeLabel({ owner, repo, issue_number: number, name }).catch((err) => {
        if (httpStatus(err) !== 404) throw err;
      });
    }
    return { status: "applied", plan };
  } catch (err) {
    console.warn("[labels] sync failed:", httpStatus(err) ?? (err as Error)?.message);
    return { status: "failed" };
  }
}
