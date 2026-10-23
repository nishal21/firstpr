import { redirect } from "next/navigation";

/** Redirect-only route: allow blocking under cacheComponents. */
export const instant = false;

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export default async function IssueRedirectPage({ params }: PageProps) {
  const { owner, repo, number } = await params;
  redirect(
    `/explain?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&issue=${encodeURIComponent(number)}`,
  );
}
