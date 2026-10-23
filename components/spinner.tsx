import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Loader2
      className={cn("size-4 shrink-0 animate-spin", className)}
      aria-label={label}
      role="status"
    />
  );
}
