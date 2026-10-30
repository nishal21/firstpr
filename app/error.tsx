"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { ErrorScene } from "@/components/error-scene";
import { useT } from "@/components/language-provider";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorScene
      code={t("error.crash.code")}
      stamp={t("error.crash.stamp")}
      command="git merge main"
      output={t("error.crash.cmdOut")}
      title={t("error.crash.title")}
      body={t("error.crash.body")}
    >
      <div className="err-actions">
        <button type="button" onClick={reset} className="sticker-pill">
          {t("error.crash.retry")}
        </button>
        <Link href="/" className="sticker-pill">
          {t("error.crash.home")}
        </Link>
        <Link href="/#match" className="sticker-pill">
          {t("nav.findIssue")}
        </Link>
      </div>
    </ErrorScene>
  );
}
