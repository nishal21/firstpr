"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <p className="text-sm font-medium text-blue-600">Something went wrong</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        We hit a snag
      </h1>
      <p className="text-slate-600">
        Try again in a moment. Your work is still on GitHub — FirstPR just
        failed to load this page.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={reset}
          className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          Retry
        </Button>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-xl border-slate-200",
          )}
        >
          Home
        </Link>
      </div>
    </section>
  );
}
