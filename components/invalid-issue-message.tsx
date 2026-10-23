"use client";

import { useT } from "@/components/language-provider";

export function InvalidIssueMessage() {
  const t = useT();
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-sm text-slate-600">{t("explain.invalidNumber")}</p>
    </section>
  );
}
