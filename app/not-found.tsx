import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <p className="text-sm font-medium text-blue-600">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="text-slate-600">
        That link doesn&apos;t match a FirstPR page. Head home and pick Match,
        Explain, or Review.
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants(),
          "rounded-xl bg-blue-600 text-white hover:bg-blue-700",
        )}
      >
        Home
      </Link>
    </section>
  );
}
