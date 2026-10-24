"use client";

import { LazyMotion, domAnimation, m, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface WordsPullUpProps {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
}

export function WordsPullUp({
  text,
  className,
  wordClassName,
  delay = 0,
}: WordsPullUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const words = text.split(" ").filter(Boolean);

  return (
    <LazyMotion features={domAnimation} strict>
      <span ref={ref} className={cn("inline-flex flex-wrap", className)}>
        {words.map((word, i) => (
          <m.span
            key={`${word}-${i}`}
            initial={reduce ? false : { y: "0.5em", opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : undefined}
            transition={{ duration: 0.7, delay: delay + i * 0.07, ease: EASE }}
            className={cn("inline-block", wordClassName)}
            style={{ marginRight: i === words.length - 1 ? 0 : "0.25em" }}
          >
            {word}
          </m.span>
        ))}
      </span>
    </LazyMotion>
  );
}

interface FadeUpProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean;
}

export function FadeUp({ children, className, delay = 0, inView = false }: FadeUpProps) {
  const reduce = useReducedMotion();
  const hidden = { y: 20, opacity: 0 };
  const shown = { y: 0, opacity: 1 };
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        initial={reduce ? false : hidden}
        animate={inView ? undefined : shown}
        whileInView={inView ? shown : undefined}
        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
        transition={{ duration: 0.7, delay, ease: EASE }}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
