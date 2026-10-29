import { getContributing, getFile, getRepo, getTree, GitHubError } from "@/lib/github";
import { estimateFromFiles, type SetupEstimate } from "@/lib/setup-estimate";

function findReadme(paths: string[]): string | null {
  const preferred = ["README.md", "README.markdown", "readme.md", "Readme.md"];
  for (const name of preferred) {
    const hit = paths.find((path) => path === name || path.endsWith(`/${name}`));
    if (hit && hit.split("/").length <= 2) return hit;
  }
  return paths.find((path) => /(^|\/)readme\.md$/i.test(path)) ?? null;
}

async function readOptional(
  owner: string,
  repo: string,
  sha: string,
  path: string,
): Promise<string | null> {
  try {
    return await getFile(owner, repo, sha, path);
  } catch (err) {
    if (err instanceof GitHubError && err.code === "not_found") return null;
    return null;
  }
}

export async function estimateRepoSetup(
  owner: string,
  repo: string,
): Promise<SetupEstimate & { defaultBranch: string }> {
  const info = await getRepo(owner, repo);
  const paths = await getTree(owner, repo, info.headSha);
  const readmePath = findReadme(paths);
  const packagePath = paths.find((path) => path === "package.json") ?? null;
  const [readme, contributing, packageJson] = await Promise.all([
    readmePath ? readOptional(owner, repo, info.headSha, readmePath) : Promise.resolve(null),
    getContributing(owner, repo, info.headSha),
    packagePath
      ? readOptional(owner, repo, info.headSha, packagePath)
      : Promise.resolve(null),
  ]);
  const estimate = estimateFromFiles({ paths, readme, contributing, packageJson });
  return { ...estimate, defaultBranch: info.defaultBranch };
}
