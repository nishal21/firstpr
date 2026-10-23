"use client";

import { useT } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { difficultyBadgeKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DifficultyBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const t = useT();
  const key = difficultyBadgeKey(label);
  const text = key ? t(key) : label;
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
      {text}
    </Badge>
  );
}
