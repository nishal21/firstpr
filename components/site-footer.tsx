"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { useT } from "@/components/language-provider";

const InkRidges = dynamic(() => import("@/components/ui/ink-ridges"), { ssr: false });
const SUN_WIDE: [number, number] = [0.84, 0.46];
const SUN_NARROW: [number, number] = [0.8, 0.27];
const NARROW_QUERY = "(max-width: 639px)";

function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

const SOURCE_URL = "https://github.com/nishal21/firstpr";
const LICENSE_URL = "https://github.com/nishal21/firstpr/blob/main/LICENSE";
const BOT_URL = "https://github.com/apps/firstprbot";

type FooterLink = { href: string; label: string; external?: boolean };

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-slate-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-9";

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
        {title}
      </p>
      <ul className="mt-3 flex flex-col">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className={linkClass}>
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const t = useT();
  const narrow = useNarrow();
  const product: FooterLink[] = [
    { href: "/", label: t("nav.findIssue") },
    { href: "/issue/nishal21/NekoDroid/4", label: t("nav.explain") },
    { href: "/review", label: t("nav.review") },
  ];
  const openSource: FooterLink[] = [
    { href: SOURCE_URL, label: t("footer.sourceLink"), external: true },
    { href: BOT_URL, label: t("footer.botLink"), external: true },
    { href: LICENSE_URL, label: t("footer.license"), external: true },
  ];
  const team: FooterLink[] = [
    { href: "https://github.com/nishal21", label: "Nishal K", external: true },
    { href: "https://github.com/zenxrth", label: "Anan Shaji", external: true },
  ];

  return (
    <footer className="relative isolate mt-auto overflow-hidden bg-[#0f1828] text-slate-100 md:rounded-t-[2rem]">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <InkRidges
          className="h-full w-full bg-[#0f1828] text-slate-100"
          inkColor="#5b9cff"
          seed={11}
          layers={4}
          horizon={narrow ? 0.3 : 0.4}
          mist={0.65}
          drift={0.04}
          parallax={0}
          paintIn={2800}
          sunPosition={narrow ? SUN_NARROW : SUN_WIDE}
          sunSize={narrow ? 0.028 : 0.06}
          scrollDepth={0}
          clouds={0.3}
          glow={0.5}
          grain={0.25}
          birds={4}
          birdsEvery={12}
          dprCap={1.25}
        />
      </div>
        <div className="mx-auto flex max-w-5xl flex-col px-4 pt-14 sm:px-6 md:pt-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
            <div className="flex min-w-0 flex-col gap-5 md:col-span-5">
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Image
                  src="/brand/logo-mark-192.png"
                  alt=""
                  width={32}
                  height={32}
                  className="footer-logo-float size-8"
                />
                <Image
                  src="/brand/wordmark-dark.png"
                  alt="FirstPR"
                  width={129}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <p className="max-w-xs text-2xl leading-tight font-semibold tracking-tight text-white">
                {t("footer.ctaTitle")}
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                {t("footer.botAbout")}
              </p>
              <Link
                href="/#match"
                className="group inline-flex min-h-11 w-full items-center justify-between gap-2 sm:w-fit sm:justify-center rounded-full bg-white py-1 pr-1 pl-5 text-sm font-medium text-[#0f1828] outline-none transition-all hover:gap-3 focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {t("hero.cta")}
                <span className="flex size-9 items-center justify-center rounded-full bg-primary transition-transform group-hover:scale-110">
                  <ArrowRight className="size-4 text-white" aria-hidden />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7 md:justify-items-end">
              <FooterColumn title={t("footer.colProduct")} links={product} />
              <FooterColumn title={t("footer.colOpenSource")} links={openSource} />
              <FooterColumn title={t("footer.colTeam")} links={team} />
            </div>
          </div>

          <p
            aria-hidden
            className="pointer-events-none mt-16 text-center text-[23vw] leading-[0.8] font-semibold tracking-[-0.07em] text-white/90 select-none md:mt-20 md:text-[11.5rem]"
          >
            FirstPR
          </p>

          <div className="mt-28 flex flex-col gap-2 border-t border-white/10 py-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between md:mt-40">
            <p>{t("footer.built")}</p>
            <p className="text-slate-400">{t("footer.tagline")}</p>
          </div>
        </div>
    </footer>
  );
}
