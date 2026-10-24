"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InvalidIssueMessage() {
  const t = useT();
  return (
    <section className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16 sm:px-6 md:py-20">
      <p className="text-sm font-medium text-primary">{t("error.notFound.code")}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("error.notFound.title")}
      </h1>
      <p className="text-muted-foreground">{t("explain.invalidNumber")}</p>
      <Link
        href="/"
        className={cn(
          buttonVariants(),
          "inline-flex h-11 min-h-11 items-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {t("error.notFound.home")}
      </Link>
    </section>
  );
}
