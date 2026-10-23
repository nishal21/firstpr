import { redirect } from "next/navigation";

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
