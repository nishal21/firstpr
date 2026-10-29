"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useT } from "@/components/language-provider";

const SOURCE_URL = "https://github.com/nishal21/firstpr";
const LICENSE_URL = "https://github.com/nishal21/firstpr/blob/main/LICENSE";
const BOT_URL = "https://github.com/apps/firstprbot";

type FooterLink = { href: string; label: string; external?: boolean };

function FooterMark() {
  return (
    <div className="footer-tilt">
      <div className="footer-spin">
        <div className="footer-plus" aria-hidden />
        <Image
          src="/brand/logo-mark-512.png"
          alt=""
          width={220}
          height={220}
          className="footer-cat-mark"
        />
      </div>
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
      { threshold: 0.2 },
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

  function allow(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return false;
    const footer = footerRef.current;
    return footer?.dataset.motion !== "off" && footer?.dataset.inview === "true";
  }

  function onEnter(event: PointerEvent<HTMLElement>) {
    if (!allow(event)) return;
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
    if (!tilt || !allow(event)) return;
    const { cx, cy, w, h } = box.current;
    const dx = (event.clientX - cx) / w;
    const dy = (event.clientY - cy) / h;
    const ry = Math.max(-14, Math.min(14, dx * 18));
    const rx = Math.max(-10, Math.min(10, -dy * 12));
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

  return (
    <footer
      ref={footerRef}
      className="mt-auto bg-[#07090f] text-white"
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="h-px bg-primary" />
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-8 md:pt-14">
        <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <h2 className="max-w-[10ch] text-[clamp(2.7rem,11vw,6.4rem)] leading-[0.88] font-semibold tracking-[-0.045em] text-primary">
            {t("footer.ctaTitle")}
          </h2>
          <p className="text-[clamp(4.2rem,18vw,7.5rem)] leading-none font-semibold tracking-[-0.06em] text-primary md:pt-2">
            ©26
          </p>
        </div>

        <div className="footer-scene-slot footer-stage">
          <div ref={tiltRef} className="pointer-events-none">
            <FooterMark />
          </div>
        </div>

        <p className="relative z-10 mt-2 max-w-sm text-xl leading-tight font-semibold text-primary md:text-3xl">
          {t("footer.tagline")}
        </p>
        <Link
          href="/#match"
          className="relative z-10 mt-5 flex min-h-16 items-center justify-between gap-3 bg-primary px-4 text-lg font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-5 md:mt-8 md:text-2xl"
        >
          {t("hero.cta")}
          <ArrowUpRight className="size-6 shrink-0" aria-hidden />
        </Link>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 text-sm text-primary sm:px-8 md:flex-row md:items-start md:justify-between">
        <ul className="flex flex-col gap-1">
          {product.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="inline-flex min-h-11 items-center outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-primary">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-1">
          {source.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="max-w-xs text-primary/80">
          <p>{t("footer.built")}</p>
          <p className="mt-2">
            <a href="https://github.com/nishal21" className="hover:text-white">Nishal K</a>
            {" · "}
            <a href="https://github.com/zenxrth" className="hover:text-white">Anan Shaji</a>
          </p>
        </div>
        <a href="#top" className="inline-flex min-h-11 items-center text-primary/80 hover:text-white">
          {t("footer.backToTop")}
        </a>
      </div>
    </footer>
  );
}
