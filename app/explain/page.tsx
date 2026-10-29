"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RedirectExplain() {
  const router = useRouter();
  const params = useSearchParams();
  const owner = params.get("owner")?.trim() ?? "";
  const repo = params.get("repo")?.trim() ?? "";
  const issue = params.get("issue")?.trim() ?? "";

  useEffect(() => {
    if (!owner || !repo || !issue) {
      router.replace("/#match");
      return;
    }
    router.replace(
      `/issue/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(issue)}`,
    );
  }, [router, owner, repo, issue]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500 sm:px-6">
      Opening explanation…
    </section>
  );
}

export default function ExplainPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-500 sm:px-6">
          Loading…
        </section>
      }
    >
      <RedirectExplain />
    </Suspense>
  );
}
