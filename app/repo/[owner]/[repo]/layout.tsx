import { notFound } from "next/navigation";
import { GitHubError, getRepo } from "@/lib/github";

const NAME = /^[A-Za-z0-9_.-]+$/;

/**
 * Runs outside this segment's loading.tsx boundary, so a missing repo answers
 * with a real 404 before the loading shell streams. getRepo is cached, so the
 * page reuses this lookup. Rate limits and other errors fall through to the page.
 */
export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const raw = await params;
  const owner = decodeURIComponent(raw.owner);
  const repo = decodeURIComponent(raw.repo);
  if (!NAME.test(owner) || !NAME.test(repo)) notFound();
  await getRepo(owner, repo).catch((err: unknown) => {
    if (err instanceof GitHubError && err.code === "not_found") notFound();
  });
  return children;
}
