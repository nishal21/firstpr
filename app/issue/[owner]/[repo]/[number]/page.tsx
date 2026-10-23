import { Suspense } from "react";
import { redirect } from "next/navigation";

type IssueParams = Promise<{
  owner: string;
  repo: string;
  number: string;
}>;

async function IssueRedirect({ params }: { params: IssueParams }) {
  const { owner, repo, number } = await params;
  redirect(
    `/explain?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&issue=${encodeURIComponent(number)}`,
  );
}

export default function IssueRedirectPage({
  params,
}: {
  params: IssueParams;
}) {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500 sm:px-6">
          Opening issue…
        </section>
      }
    >
      <IssueRedirect params={params} />
    </Suspense>
  );
}
