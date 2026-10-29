"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
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
  const box = useRef({ left: 0, top: 0, width: 0, height: 0 });

  function allow(event: PointerEvent<HTMLAnchorElement>): boolean {
    if (event.pointerType !== "mouse") return false;
    const footer = event.currentTarget.closest("footer");
    return footer?.getAttribute("data-motion") !== "off";
  }

  function onEnter(event: PointerEvent<HTMLAnchorElement>) {
    if (!allow(event)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    box.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function onMove(event: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || !allow(event)) return;
    const cached = box.current;
    const dx = event.clientX - (cached.left + cached.width / 2);
    const dy = event.clientY - (cached.top + cached.height / 2);
    const tx = Math.max(-6, Math.min(6, dx * 0.12));
    const ty = Math.max(-4, Math.min(4, dy * 0.16));
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "translate3d(0, 0, 0)";
  }

  const className =
    "footer-mag inline-flex min-h-11 items-center text-[1.05rem] leading-tight text-white outline-none focus-visible:ring-2 focus-visible:ring-[#7ea2ff]";

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
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-[0.18em] text-white/45 uppercase">
        {title}
      </p>
      <ul className="mt-3 flex flex-col">
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

function MarqueeGroup() {
  return (
    <div className="footer-marquee-group">
      <span className="footer-word">FirstPR</span>
      <Image
        src="/brand/logo-mark-512.png"
        alt=""
        width={160}
        height={160}
        className="footer-cat"
      />
      <span className="footer-word">FirstPR</span>
      <Image
        src="/brand/logo-mark-512.png"
        alt=""
        width={160}
        height={160}
        className="footer-cat"
      />
    </div>
  );
}

export function SiteFooter() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReduce = () => {
      if (reduce.matches) {
        el.dataset.motion = "off";
        el.dataset.inview = "false";
      } else {
        delete el.dataset.motion;
      }
    };
    applyReduce();
    reduce.addEventListener("change", applyReduce);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (el.dataset.motion === "off") return;
        el.dataset.inview = entry?.isIntersecting ? "true" : "false";
      },
      { threshold: 0.12 },
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
    <footer ref={ref} className="mt-auto bg-white text-[#111418]">
      <div className="mx-auto max-w-[90rem] px-4 pt-16 pb-6 sm:px-8 md:pt-24 md:pb-8">
        <p className="text-[clamp(2.6rem,6.2vw,5.6rem)] leading-[0.9] font-semibold tracking-[-0.055em] text-balance">
          {t("footer.ctaTitle")}
        </p>
      </div>
      <div className="h-3 bg-[#d5d8de]" aria-hidden />
      <div className="bg-[#0c1016] text-white">
        <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-6 gap-y-8 px-4 pt-10 sm:grid-cols-3 sm:px-8 md:pt-12">
          <Column title={t("footer.colProduct")} links={product} />
          <Column title={t("footer.colOpenSource")} links={source} />
          <Column title={t("footer.colTeam")} links={team} />
        </div>
        <div className="mx-auto mt-6 max-w-[90rem] border-t border-dotted border-white/25" />

        <div className="footer-marquee mt-2 overflow-hidden" aria-hidden>
          <div className="footer-marquee-track">
            <MarqueeGroup />
            <MarqueeGroup />
          </div>
        </div>

        <p className="mx-auto max-w-md px-4 pt-6 pb-10 text-center text-sm leading-relaxed text-white/70 sm:text-base">
          {t("footer.tagline")}
        </p>

        <div className="mx-auto flex max-w-[90rem] flex-col gap-3 border-t border-white/10 px-4 py-5 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-md">{t("footer.built")}</p>
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#7ea2ff]"
          >
            {t("footer.license")}
          </a>
          <a
            href="#top"
            className="inline-flex min-h-11 items-center outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#7ea2ff]"
          >
            {t("footer.backToTop")}
          </a>
        </div>
      </div>
    </footer>
  );
}
