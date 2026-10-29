"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useT } from "@/components/language-provider";

const SOURCE_URL = "https://github.com/nishal21/firstpr";
const LICENSE_URL = "https://github.com/nishal21/firstpr/blob/main/LICENSE";
const BOT_URL = "https://github.com/apps/firstprbot";

type FooterLink = { href: string; label: string; external?: boolean };

function MagLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const box = useRef({ w: 0, h: 0 });

  function onEnter(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== "mouse") return;
    if (event.currentTarget.closest("footer")?.getAttribute("data-motion") === "off") return;
    box.current = {
      w: event.currentTarget.offsetWidth,
      h: event.currentTarget.offsetHeight,
    };
  }

  function onMove(event: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    if (el.closest("footer")?.getAttribute("data-motion") === "off") return;
    const dx = event.nativeEvent.offsetX - box.current.w / 2;
    const dy = event.nativeEvent.offsetY - box.current.h / 2;
    const tx = Math.max(-6, Math.min(6, dx * 0.12));
    const ty = Math.max(-4, Math.min(4, dy * 0.16));
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "translate3d(0, 0, 0)";
  }

  const className =
    "footer-mag inline-flex min-h-11 items-center text-base font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-current";

  if (external) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onPointerEnter={onEnter}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </Link>
  );
}

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--footer-muted)] uppercase">
        {title}
      </p>
      <ul className="mt-2">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <MagLink href={link.href} external={link.external}>
              {link.label}
            </MagLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const t = useT();
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReduce = () => {
      if (reduce.matches) {
        el.dataset.motion = "off";
        el.dataset.inview = "false";
        el.dataset.seen = "true";
      } else {
        delete el.dataset.motion;
      }
    };
    applyReduce();
    reduce.addEventListener("change", applyReduce);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (el.dataset.motion === "off") return;
        const on = Boolean(entry?.isIntersecting);
        el.dataset.inview = on ? "true" : "false";
        if (on) el.dataset.seen = "true";
      },
      { threshold: 0.15 },
    );
    io.observe(el);

    const footerEl = el;
    function onVis() {
      if (document.hidden) footerEl.dataset.hold = "true";
      else delete footerEl.dataset.hold;
    }
    document.addEventListener("visibilitychange", onVis);

    return () => {
      reduce.removeEventListener("change", applyReduce);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const product: FooterLink[] = [
    { href: "/", label: t("nav.findIssue") },
    { href: "/issue/nishal21/NekoDroid/4", label: t("nav.explain") },
    { href: "/review", label: t("nav.review") },
  ];
  const source: FooterLink[] = [
    { href: SOURCE_URL, label: t("footer.sourceLink"), external: true },
    { href: BOT_URL, label: t("footer.botLink"), external: true },
    { href: LICENSE_URL, label: t("footer.license"), external: true },
  ];
  const team: FooterLink[] = [
    { href: "https://github.com/nishal21", label: "Nishal K", external: true },
    { href: "https://github.com/zenxrth", label: "Anan Shaji", external: true },
  ];

  return (
    <footer ref={footerRef} className="site-footer mt-auto">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-8 md:pt-16">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-md text-2xl leading-tight font-semibold tracking-tight md:text-4xl">
            {t("footer.ctaTitle")}
          </p>
          <Link
            href="/#match"
            className="footer-cta inline-flex min-h-12 items-center gap-3 rounded-full bg-[var(--footer-bar)] px-5 text-base font-semibold text-[var(--footer-bar-ink)] outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            {t("hero.cta")}
            <ArrowUpRight className="footer-cta-arrow size-5" aria-hidden />
          </Link>
        </div>

        <nav aria-label={t("footer.nav")} className="relative z-10 mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <Column title={t("footer.colProduct")} links={product} />
          <Column title={t("footer.colOpenSource")} links={source} />
          <Column title={t("footer.colTeam")} links={team} />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--footer-muted)] uppercase">
              FirstPR
            </p>
            <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-[var(--footer-muted)]">
              {t("footer.built")}
            </p>
            <a
              href="#top"
              className="mt-2 inline-flex min-h-11 items-center text-base font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-current"
            >
              {t("footer.backToTop")}
            </a>
          </div>
        </nav>

        <div className="footer-scene" aria-hidden>
          <div className="footer-glow" />
          <Image src="/brand/logo-mark-512.png" alt="" width={190} height={190} className="footer-orb footer-orb-a" />
          <Image src="/brand/logo-mark-512.png" alt="" width={120} height={120} className="footer-orb footer-orb-b" />
          <Image src="/brand/logo-mark-512.png" alt="" width={78} height={78} className="footer-orb footer-orb-c" />
        </div>
      </div>
      <div className="footer-wordwrap" aria-hidden>
        <p className="footer-giant">FirstPR</p>
      </div>
    </footer>
  );
}
