import { IssueExplain } from "@/components/issue-explain";

/** Interactive explain page: allow blocking under cacheComponents. */
export const instant = false;

type PageProps = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function IssueExplainPage({
  params,
  searchParams,
}: PageProps) {
  const { owner, repo, number: numberRaw } = await params;
  const { lang } = await searchParams;
  const number = Number(numberRaw);

  if (!Number.isFinite(number) || number < 1) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-sm text-slate-600">Invalid issue number.</p>
      </section>
    );
  }

  return (
    <IssueExplain
      owner={decodeURIComponent(owner)}
      repo={decodeURIComponent(repo)}
      number={number}
      lang={lang?.trim() || null}
    />
  );
}
