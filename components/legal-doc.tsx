import type { ReactNode } from "react";
import Link from "next/link";

export function LegalDoc({
  title,
  toc,
  children,
}: {
  title: string;
  toc: { id: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-[70ch] px-4 py-10 sm:px-6 md:py-14">
      <p className="font-plex text-xs tracking-wide text-muted-foreground">Last updated: 29 October 2026</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
      <nav aria-label="On this page" className="ink-card mt-6 p-4">
        <p className="font-plex text-[11px] tracking-[0.16em] text-[#3f3a32] uppercase">On this page</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {toc.map((item) => (
            <li key={item.id}>
              <a className="text-[#16140f] underline-offset-2 hover:underline" href={`#${item.id}`}>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="legal-body mt-8 space-y-8 text-base leading-relaxed text-foreground">{children}</div>
      <p className="mt-10 text-sm">
        <Link href="/" className="underline-offset-2 hover:underline">
          Back home
        </Link>
      </p>
    </article>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-[1.02rem]">{children}</div>
    </section>
  );
}
