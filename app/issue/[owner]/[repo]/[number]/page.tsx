import { IssueExplain } from "@/components/issue-explain";
import { InvalidIssueMessage } from "@/components/invalid-issue-message";

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

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
