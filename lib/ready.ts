import { getContributing, getFile, getRepo, getTree, GitHubError, listGoodFirstIssues } from "@/lib/github";
import { scoreNewcomerReady, type ReadyScore } from "@/lib/ready-score";
import { estimateFromFiles } from "@/lib/setup-estimate";

function findReadme(paths: string[]): string | null {
  return (
    paths.find((path) => path === "README.md" || path.toLowerCase() === "readme.md") ??
    paths.find((path) => /(^|\/)readme\.md$/i.test(path) && path.split("/").length <= 2) ??
    null
  );
}

export type ReadyReport = ReadyScore & {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  language: string | null;
  openUnassignedGfi: number;
  setupMinutes: number | null;
  htmlUrl: string;
};

export async function buildReadyReport(owner: string, repo: string): Promise<ReadyReport> {
  const info = await getRepo(owner, repo);
  const [paths, issues] = await Promise.all([
    getTree(owner, repo, info.headSha),
    listGoodFirstIssues(owner, repo),
  ]);
  const openUnassigned = issues.filter(
    (issue) => issue.state === "open" && issue.assignees.length === 0,
  );
  const readmePath = findReadme(paths);
  let readme: string | null = null;
  if (readmePath) {
    try {
      readme = await getFile(owner, repo, info.headSha, readmePath);
    } catch (err) {
      if (!(err instanceof GitHubError)) readme = null;
    }
  }
  const contributing = await getContributing(owner, repo, info.headSha);
  const setup = estimateFromFiles({
    paths,
    readme,
    contributing,
    packageJson: null,
  });
  const hasSetupHeading = setup.signals.includes("README setup section");
  const scored = scoreNewcomerReady({
    paths,
    openUnassignedGfi: openUnassigned.length,
    setupMinutes: setup.minutes,
    hasSetupHeading,
  });

  return {
    ...scored,
    owner,
    repo,
    description: info.description,
    stars: info.stars,
    language: info.language,
    openUnassignedGfi: openUnassigned.length,
    setupMinutes: setup.minutes,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}
