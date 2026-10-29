import { RepoReadiness, type RepoIssueCard } from "@/components/repo-readiness";
import { getContributing, getRepo, listGoodFirstIssues } from "@/lib/github";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NAME = /^[A-Za-z0-9_.-]+$/;

type PageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepoReadyPage({ params }: PageProps) {
  const raw = await params;
  const owner = decodeURIComponent(raw.owner);
  const repo = decodeURIComponent(raw.repo);

  if (!NAME.test(owner) || !NAME.test(repo)) {
    return (
      <RepoReadiness
        owner={owner}
        repo={repo}
        description={null}
        language={null}
        stars={null}
        contributing={null}
        issues={[]}
        error="missing"
      />
    );
  }

  let description: string | null = null;
  let language: string | null = null;
  let stars: number | null = null;
  let contributing: boolean | null = null;
  let issues: RepoIssueCard[] = [];
  let error: "missing" | "issues" | null = null;

  try {
    const info = await getRepo(owner, repo);
    description = info.description;
    language = info.language;
    stars = info.stars;
    try {
      const [list, guide] = await Promise.all([
        listGoodFirstIssues(owner, repo),
        getContributing(owner, repo, info.headSha),
      ]);
      contributing = Boolean(guide && guide.trim());
      issues = list.slice(0, 8).map((issue) => ({
        number: issue.number,
        title: issue.title,
        assignees: issue.assignees,
      }));
    } catch {
      error = "issues";
    }
  } catch {
    error = "missing";
  }

  return (
    <RepoReadiness
      owner={owner}
      repo={repo}
      description={description}
      language={language}
      stars={stars}
      contributing={contributing}
      issues={issues}
      error={error}
    />
  );
}
