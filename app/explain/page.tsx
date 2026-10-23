"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ExplainClient } from "@/components/explain-client";

function ExplainFromQuery() {
  const params = useSearchParams();
  const owner = params.get("owner")?.trim() || "nishal21";
  const repo = params.get("repo")?.trim() || "NekoDroid";
  const issueNumber = Number(params.get("issue")) || 4;

  return (
    <ExplainClient
      initialOwner={owner}
      initialRepo={repo}
      initialIssueNumber={issueNumber}
    />
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
      <ExplainFromQuery />
    </Suspense>
  );
}
