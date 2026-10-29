import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IssueExplain } from "@/components/issue-explain";
import { JsonLd } from "@/components/json-ld";
import { loadIssueMeta } from "@/lib/issue-meta";
import { issuePath } from "@/lib/issue-path";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const raw = await params;
  const meta = await loadIssueMeta(raw.owner, raw.repo, raw.number);
  if (!meta || meta.missing) {
    return pageMetadata({
      title: "Issue not found",
      description: "That address is not a GitHub issue FirstPR can open.",
      path: "/explain",
      noindex: true,
    });
  }
  const ref = `${meta.owner}/${meta.repo}#${meta.number}`;
  const title = meta.title ? `${meta.title} (${ref})` : `Explain ${ref}`;
  const description = meta.title
    ? `A beginner guide to ${ref} "${meta.title}": what the issue asks for and which files in ${meta.owner}/${meta.repo} to read first.`
    : `A beginner guide to GitHub issue ${ref}: what it asks for and which files in ${meta.owner}/${meta.repo} to read first.`;
  return pageMetadata({ title, description, path: issuePath(meta) });
}

export default async function IssueExplainPage({ params }: PageProps) {
  const { owner, repo, number: numberRaw } = await params;
  const meta = await loadIssueMeta(owner, repo, numberRaw);
  // Bad links and issues GitHub says do not exist get a real 404, not a soft 404.
  if (!meta || meta.missing) notFound();
  const number = meta.number;
  const ownerName = decodeURIComponent(owner);
  const repoName = decodeURIComponent(repo);
  const crumbs = breadcrumbs([
    { name: "FirstPR", path: "/" },
    { name: "Explain", path: "/explain" },
    { name: `${ownerName}/${repoName}`, path: `/repo/${encodeURIComponent(ownerName)}/${encodeURIComponent(repoName)}` },
    { name: `#${number}`, path: issuePath({ owner: ownerName, repo: repoName, number }) },
  ]);

  return (
    <>
      <JsonLd data={crumbs} />
      <IssueExplain owner={ownerName} repo={repoName} number={number} heading={meta?.title} />
    </>
  );
}
