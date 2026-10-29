import type { Metadata } from "next";
import { Suspense } from "react";
import ReviewForm from "@/components/review-form";

export const metadata: Metadata = {
  title: "Review my PR",
  description:
    "Paste a pull request or a diff. FirstPR scores it from a checklist in code, then you copy the comment.",
  alternates: { canonical: "/review" },
};

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
          Loading…
        </section>
      }
    >
      <ReviewForm />
    </Suspense>
  );
}
