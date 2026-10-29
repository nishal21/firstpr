import { cn } from "@/lib/utils";

/** Tinted top band for inner pages, same look as the home hero. */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("merge-hero relative border-b-[3px] border-[#16140f]", className)}>
      <div className="relative mx-auto max-w-5xl px-4 pt-8 pb-8 sm:px-6 md:pt-14 md:pb-12">
        {eyebrow ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-3 text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.03em] text-foreground break-words sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
