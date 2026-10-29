"use client";

import type { ReactNode } from "react";

/**
 * Full-bleed blue scene for 404 and crash pages. It sits on the footer blue so
 * the page and the footer read as one wall; the footer drops its MERGED word
 * while a scene is on the page (see `.err-scene` in globals.css).
 */
export function ErrorScene({
  code,
  stamp,
  command,
  output,
  title,
  body,
  children,
}: {
  code: string;
  stamp: string;
  command: string;
  output: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section className="err-scene">
      <div className="err-inner">
        <p className="err-cmd font-plex">
          <span className="err-prompt" aria-hidden>
            $
          </span>{" "}
          {command}
          <span className="err-out">{output}</span>
        </p>
        <div className="err-code-wrap" aria-hidden>
          <p className="err-code font-spray">{code}</p>
          <p className="err-stamp font-spray">✕ {stamp}</p>
        </div>
        <h1 className="err-title font-spray">{title}</h1>
        <p className="err-body">{body}</p>
        {children}
      </div>
    </section>
  );
}
