import { redirect } from "next/navigation";
import { ExplainEntry } from "@/components/explain-entry";
import { issuePath } from "@/lib/issue-path";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Explain a GitHub issue",
  description:
    "Paste a GitHub issue link and FirstPR summarizes it, pointing to the real files in the repo it touches. It explains the issue; it does not write the patch.",
  path: "/explain",
});

type ExplainPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function ExplainPage({ searchParams }: ExplainPageProps) {
  const sp = await searchParams;
  const owner = one(sp.owner);
  const repo = one(sp.repo);
  const issue = one(sp.issue);
  // Old /explain?owner=&repo=&issue= links still open that issue.
  if (owner && repo && /^\d+$/.test(issue)) {
    redirect(issuePath({ owner, repo, number: Number(issue) }));
  }
  return <ExplainEntry />;
}
