"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { arrowPillClass } from "@/components/ui/arrow-pill";
import { cn } from "@/lib/utils";

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
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 px-4 py-12 sm:px-6">
      <div className="ink-card w-full space-y-3 p-5">
      <Link
        href="/"
        className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Image
          src="/brand/logo-mark-192.png"
          alt=""
          width={28}
          height={28}
          className="size-7"
        />
        <Image
          src="/brand/wordmark-light.png"
          alt="FirstPR"
          width={120}
          height={24}
          className="h-6 w-auto"
        />
      </Link>
      <p className="text-sm font-medium text-primary">{t("error.crash.eyebrow")}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("error.crash.title")}
      </h1>
      <p className="text-muted-foreground">{t("error.crash.body")}</p>
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="button" onClick={reset} className={arrowPillClass}>
          {t("error.crash.retry")}
        </button>
        <Link href="/" className={cn(arrowPillClass, "bg-[var(--fill)] text-[var(--fill-foreground)]")}>
          {t("error.crash.home")}
        </Link>
      </div>
      </div>
    </section>
  );
}
