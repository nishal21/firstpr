"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useT } from "@/components/language-provider";

const RING = Array.from({ length: 64 }, (_, index) => {
  const angle = (index / 64) * Math.PI * 2;
  return {
    cx: (100 + Math.cos(angle) * 78).toFixed(2),
    cy: (100 + Math.sin(angle) * 78).toFixed(2),
  };
});

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
  const tiltRef = useRef<HTMLDivElement>(null);
  const box = useRef({ cx: 0, cy: 0, w: 1, h: 1 });

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

  function onEnter(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    if (footerRef.current?.dataset.motion === "off") return;
    const rect = event.currentTarget.getBoundingClientRect();
    box.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      w: rect.width || 1,
      h: rect.height || 1,
    };
  }

  function onMove(event: PointerEvent<HTMLElement>) {
    const tilt = tiltRef.current;
    if (!tilt || event.pointerType !== "mouse") return;
    if (footerRef.current?.dataset.motion === "off" || footerRef.current?.dataset.inview !== "true") return;
    const { cx, cy, w, h } = box.current;
    const rx = Math.max(-8, Math.min(8, -((event.clientY - cy) / h) * 10));
    const ry = Math.max(-10, Math.min(10, ((event.clientX - cx) / w) * 14));
    tilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }

  function onLeave() {
    if (tiltRef.current) tiltRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
  }

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
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-8 sm:px-8 md:pt-12 md:pb-10">
        <div
          ref={tiltRef}
          className="footer-tilt"
          onPointerEnter={onEnter}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
        >
          <div className="footer-ringwrap" aria-hidden>
            <svg className="footer-ring" viewBox="0 0 200 200">
              {RING.map((dot, index) => (
                <circle key={index} cx={dot.cx} cy={dot.cy} r="2.15" fill="currentColor" />
              ))}
            </svg>
            <Image
              src="/brand/logo-mark-512.png"
              alt=""
              width={240}
              height={240}
              className="footer-mascot"
            />
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-col gap-8 md:mt-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <p className="text-2xl leading-tight font-semibold tracking-tight md:text-4xl">
              {t("footer.ctaTitle")}
            </p>
            <Link
              href="/#match"
              className="footer-cta mt-4 inline-flex min-h-12 items-center gap-3 rounded-full bg-[var(--footer-bar)] px-5 text-base font-semibold text-[var(--footer-bar-ink)] outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              {t("hero.cta")}
              <ArrowUpRight className="footer-cta-arrow size-5" aria-hidden />
            </Link>
          </div>
          <nav aria-label={t("footer.nav")} className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
            <Column title={t("footer.colProduct")} links={product} />
            <Column title={t("footer.colOpenSource")} links={source} />
            <Column title={t("footer.colTeam")} links={team} />
          </nav>
        </div>
        <p className="relative z-10 mt-6 max-w-md text-sm leading-relaxed text-[var(--footer-muted)]">
          {t("footer.built")}
          {" · "}
          <a href="#top" className="font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-current">
            {t("footer.backToTop")}
          </a>
        </p>
      </div>
    </footer>
  );
}
