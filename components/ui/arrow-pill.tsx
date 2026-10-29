import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Solid blue sticker. Presses down on click. No blur. */
export const arrowPillClass =
  "group inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-[var(--ink)] bg-[#0473fd] px-4 text-sm font-semibold text-white shadow-[4px_4px_0_var(--shadow)] outline-none transition-[transform,box-shadow] duration-100 ease-linear active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_var(--shadow)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--ink)] disabled:pointer-events-none disabled:opacity-50 sm:text-base";

export function ArrowBubble({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <ArrowRight className={cn("size-4 text-white", iconClassName, className)} aria-hidden />
  );
}
