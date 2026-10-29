const ALGOLIA_HREF = "https://www.algolia.com/?utm_medium=AOS-referral";

/** Required Algolia for Open Source attribution. Shown only when search uses Algolia. */
export function AlgoliaMark({ className }: { className?: string }) {
  return (
    <a
      href={ALGOLIA_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "inline-flex min-h-11 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"}
    >
      <span className="text-xs text-muted-foreground">Search by</span>
      {/* Local brand SVG. next/image blocks SVG unless dangerouslyAllowSVG is on. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/algolia-wordmark.svg"
        alt="Algolia"
        width={88}
        height={22}
        className="h-5 w-auto"
      />
    </a>
  );
}
