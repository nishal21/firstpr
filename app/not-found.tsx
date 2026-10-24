"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  const t = useT();

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
      <p className="text-sm font-medium text-primary">{t("error.notFound.code")}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("error.notFound.title")}
      </h1>
      <p className="text-muted-foreground">{t("error.notFound.body")}</p>
      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href="/"
          className={cn(
            buttonVariants(),
            "inline-flex h-11 min-h-11 items-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {t("error.notFound.home")}
        </Link>
        <Link
          href="/#match"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-11 min-h-11 items-center rounded-xl border-border",
          )}
        >
          {t("nav.findIssue")}
        </Link>
        <Link
          href="/review"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-11 min-h-11 items-center rounded-xl border-border",
          )}
        >
          {t("nav.review")}
        </Link>
      </div>
    </section>
  );
}
