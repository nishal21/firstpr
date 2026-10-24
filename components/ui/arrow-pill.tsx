import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Primary pill CTA: label plus a round arrow bubble that grows on hover. */
export const arrowPillClass =
  "group inline-flex min-h-11 items-center justify-between gap-2 sm:justify-center rounded-full bg-primary py-1 pr-1 pl-5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 outline-none transition-all hover:gap-3 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 sm:text-base";

export function ArrowBubble({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-white transition-transform group-hover:scale-110 motion-reduce:transition-none",
        className,
      )}
    >
      <ArrowRight className={cn("size-4 text-primary", iconClassName)} aria-hidden />
    </span>
  );
}
