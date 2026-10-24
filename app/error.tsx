"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <section className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 px-4 py-16 sm:px-6 md:py-20">
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
        <Button
          type="button"
          onClick={reset}
          className="h-11 min-h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {t("error.crash.retry")}
        </Button>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-11 min-h-11 items-center rounded-xl border-border",
          )}
        >
          {t("error.crash.home")}
        </Link>
      </div>
    </section>
  );
}
