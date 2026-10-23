"use client";

import { useT } from "@/components/language-provider";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6">
        {t("footer.built")}
      </div>
    </footer>
  );
}
