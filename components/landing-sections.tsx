"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useT } from "@/components/language-provider";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { cn } from "@/lib/utils";

const PAPER = "https://doi.org/10.1145/3368089.3409746";

export function ContrastSection() {
  const t = useT();
  return (
    <section className="below-fold border-y border-border bg-secondary/50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t("landing.contrastTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("landing.contrastLead")}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <CompareCard
            title={t("landing.rawTitle")}
            tone="bad"
            lines={[t("landing.raw1"), t("landing.raw2"), t("landing.raw3")]}
          />
          <CompareCard
            title={t("landing.firstTitle")}
            tone="good"
            lines={[t("landing.first1"), t("landing.first2"), t("landing.first3")]}
          />
        </div>
      </div>
    </section>
  );
}

function CompareCard({
  title,
  tone,
  lines,
}: {
  title: string;
  tone: "good" | "bad";
  lines: string[];
}) {
  const Icon = tone === "good" ? Check : X;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3">
        {lines.map((line) => (
          <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "good" ? "text-emerald-600" : "text-red-500",
              )}
              aria-hidden
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ResearchSection() {
  const t = useT();
  return (
    <section className="below-fold mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
        {t("landing.researchTitle")}
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("landing.researchBody")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <blockquote className="rounded-2xl border border-border bg-card p-5 text-lg leading-snug font-medium tracking-tight text-foreground sm:p-6">
          {t("landing.stat1")}
        </blockquote>
        <blockquote className="rounded-2xl border border-border bg-card p-5 text-lg leading-snug font-medium tracking-tight text-foreground sm:p-6">
          {t("landing.stat2")}
        </blockquote>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {t("landing.statSource")}{" "}
        <a
          href={PAPER}
          className="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {t("landing.statLink")}
        </a>
      </p>
    </section>
  );
}

const HOW = [
  { n: "1", titleKey: "steps.match.title", bodyKey: "steps.match.line", href: "/#match" },
  { n: "2", titleKey: "steps.explain.title", bodyKey: "steps.explain.line", href: "/#match" },
  { n: "3", titleKey: "steps.review.title", bodyKey: "steps.review.line", href: "/review" },
] as const;

export function HowSection() {
  const t = useT();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 50%"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const scaleY = useTransform(smooth, [0, 1], [0, 1]);

  return (
    <section id="how" className="below-fold scroll-mt-20 border-y border-border bg-secondary/40">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-12 md:py-24">
        <div className="md:sticky md:top-24 md:col-span-5 md:self-start">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {t("nav.how")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {t("landing.howTitle")}
          </h2>
        </div>
        <div ref={ref} className="relative md:col-span-7">
          <div className="absolute top-2 bottom-2 left-[15px] w-px bg-border" aria-hidden />
          {reduce ? null : (
            <motion.div
              style={{ scaleY }}
              className="absolute top-2 bottom-2 left-[15px] w-px origin-top bg-primary"
              aria-hidden
            />
          )}
          <ol className="space-y-8">
            {HOW.map((step) => (
              <li key={step.n} className="relative pl-12">
                <span className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {step.n}
                </span>
                <h3 className="text-xl font-semibold">{t(step.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
                <Link
                  href={step.href}
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {step.n === "3" ? t("nav.review") : t("hero.cta")}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  const t = useT();
  return (
    <section className="below-fold mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.audienceTitle")}</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">{t("landing.studentsTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("landing.studentsBody")}</p>
          <Link href="/journey" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            {t("nav.journey")}
          </Link>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">{t("landing.maintainersTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("landing.maintainersBody")}</p>
          <Link href="/ready" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            {t("landing.maintainersCta")}
          </Link>
        </article>
      </div>
    </section>
  );
}

export function ProTeaser() {
  const t = useT();
  return (
    <section id="pro" className="below-fold scroll-mt-20 mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-dashed border-primary/30 bg-accent/40 p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{t("landing.proBadge")}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("landing.proTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("landing.proBody")}</p>
      </div>
    </section>
  );
}

const FAQ = [
  ["faq.q1", "faq.a1"],
  ["faq.q2", "faq.a2"],
  ["faq.q3", "faq.a3"],
  ["faq.q4", "faq.a4"],
  ["faq.q5", "faq.a5"],
  ["faq.q6", "faq.a6"],
] as const;

export function FaqSection() {
  const t = useT();
  return (
    <section id="faq" className="below-fold mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("landing.faqTitle")}</h2>
      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
              {t(q)}
              <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden>
                +
              </span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{t(a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  const t = useT();
  return (
    <section className="below-fold mx-auto max-w-5xl px-4 pb-8 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-[#0f1828] px-6 py-12 text-white sm:px-10 md:py-16">
        <div
          className="pointer-events-none absolute -top-16 right-0 size-64 rounded-full bg-primary/40 blur-3xl"
          aria-hidden
        />
        <h2 className="relative max-w-xl text-3xl font-semibold tracking-tight md:text-5xl">
          {t("landing.finalTitle")}
        </h2>
        <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-slate-300">{t("landing.finalBody")}</p>
        <Link href="/#match" className={cn(arrowPillClass, "relative mt-6 w-full bg-white text-[#0f1828] hover:bg-white/90 sm:w-auto")}>
          {t("hero.cta")}
          <ArrowBubble />
        </Link>
      </div>
    </section>
  );
}

export function MobileFindBar() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const match = document.getElementById("match");
    const footer = document.querySelector("footer");
    let matchOn = false;
    let footerOn = false;
    const update = () => {
      setShow(window.scrollY > 520 && !matchOn && !footerOn);
    };
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === match) matchOn = entry.isIntersecting;
          if (entry.target === footer) footerOn = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0.12 },
    );
    if (match) obs.observe(match);
    if (footer) obs.observe(footer);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
      <Link href="/#match" className={cn(arrowPillClass, "w-full")}>
        {t("hero.cta")}
        <ArrowBubble />
      </Link>
    </div>
  );
}
