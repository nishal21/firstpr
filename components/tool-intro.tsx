import type { LucideIcon } from "lucide-react";

/**
 * Top band for the tool pages (Explain, Review): a sticker step tag, the
 * spray display heading from the home hero, and a row of small check chips.
 */
export function ToolIntro({
  icon: Icon,
  step,
  title,
  subtitle,
  chipsLabel,
  chips,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  subtitle: string;
  chipsLabel: string;
  chips: { icon: LucideIcon; label: string }[];
}) {
  return (
    <div className="merge-hero border-b-[3px] border-[var(--ink)]">
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-7 sm:px-6 md:pt-12 md:pb-10">
        <span className="inline-flex min-h-9 items-center gap-1.5 border-[3px] border-[var(--ink)] bg-[var(--paper)] px-3 text-sm font-semibold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
          <Icon className="size-4 text-[#0473fd]" aria-hidden />
          {step}
        </span>
        <h1 className="font-spray mt-4 text-[2.1rem] leading-[0.95] text-foreground break-words sm:text-5xl md:text-6xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg">
          {subtitle}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="font-plex mr-1 text-xs tracking-wide text-foreground/70 uppercase">
            {chipsLabel}
          </span>
          {chips.map(({ icon: ChipIcon, label }) => (
            <span key={label} className="check-chip">
              <ChipIcon className="size-3.5 shrink-0 text-[#0473fd]" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
