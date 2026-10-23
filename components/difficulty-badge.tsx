import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DifficultyBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const isStretch = label.toLowerCase() === "stretch";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md border text-xs font-medium",
        isStretch
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
