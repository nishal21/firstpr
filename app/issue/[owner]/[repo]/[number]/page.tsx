import type { Metadata } from "next";
import { IssueExplain } from "@/components/issue-explain";
import { InvalidIssueMessage } from "@/components/invalid-issue-message";

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo, number } = await params;
  const label = `${owner}/${repo}#${number}`;
  return {
    title: `Explain ${label}`,
    description: `Where to look and what done means for ${label}. FirstPR never writes the fix.`,
  };
}

export default async function IssueExplainPage({ params }: PageProps) {
  const { owner, repo, number: numberRaw } = await params;
  const number = Number(numberRaw);

  if (!Number.isFinite(number) || number < 1) {
    return <InvalidIssueMessage />;
  }

  return (
    <IssueExplain
      owner={decodeURIComponent(owner)}
      repo={decodeURIComponent(repo)}
      number={number}
    />
  );
}
