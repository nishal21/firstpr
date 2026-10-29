"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ErrorScene } from "@/components/error-scene";
import { useT } from "@/components/language-provider";
import { SiteSearch } from "@/components/site-search";

function shortPath(path: string) {
  return path.length > 36 ? `${path.slice(0, 35)}…` : path;
}

export default function NotFound() {
  const t = useT();
  const path = usePathname() || "/";

  return (
    <ErrorScene
      code={t("error.notFound.code")}
      stamp={t("error.notFound.stamp")}
      command={`git checkout ${shortPath(path)}`}
      output={t("error.notFound.cmdOut")}
      title={t("error.notFound.title")}
      body={t("error.notFound.body")}
    >
      <div className="err-search">
        <SiteSearch />
      </div>
      <nav className="err-actions" aria-label={t("error.notFound.title")}>
        <Link href="/" className="sticker-pill">
          {t("error.notFound.home")}
        </Link>
        <Link href="/#match" className="sticker-pill">
          {t("nav.findIssue")}
        </Link>
        <Link href="/review" className="sticker-pill">
          {t("nav.review")}
        </Link>
      </nav>
    </ErrorScene>
  );
}
