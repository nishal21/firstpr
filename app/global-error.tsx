"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root-level crash UI (replaces the root layout). Keep English and inline
 * styles so it still works when providers and fonts fail. Same blue wall as
 * the 404 scene and the footer.
 */
const INK = "#16140f";
const CREAM = "#f4efe6";
const BLUE = "#0473fd";

const pill = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "2.75rem",
  padding: "0.2rem 0.9rem",
  border: `3px solid ${INK}`,
  background: CREAM,
  color: INK,
  boxShadow: `3px 3px 0 ${INK}`,
  fontSize: "0.95rem",
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "inherit",
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: BLUE,
          color: INK,
        }}
      >
        <div
          aria-hidden
          style={{
            background: INK,
            color: CREAM,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: "0.18em",
            padding: "0.45rem 1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {"+ + + − − − ".repeat(30)}
        </div>
        <main style={{ maxWidth: "40rem", margin: "0 auto", padding: "3rem 1.25rem 4rem" }}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", fontWeight: 600 }}>
            $ git merge main
            <br />
            CONFLICT: FirstPR failed to load
          </p>
          <div style={{ position: "relative", margin: "1.5rem 0 0" }} aria-hidden>
            <p
              style={{
                margin: 0,
                fontSize: "clamp(5rem, 24vw, 10rem)",
                fontWeight: 900,
                lineHeight: 0.85,
                letterSpacing: "-0.04em",
                color: CREAM,
                WebkitTextStroke: `3px ${INK}`,
                textShadow: `6px 6px 0 ${INK}`,
              }}
            >
              Oops
            </p>
            <p
              style={{
                position: "absolute",
                right: "8%",
                top: "30%",
                margin: 0,
                padding: "0.1rem 0.6rem",
                border: "3px solid #b42318",
                background: CREAM,
                color: "#b42318",
                fontWeight: 900,
                fontSize: "clamp(1.2rem, 5vw, 2rem)",
                textTransform: "uppercase",
                transform: "rotate(-9deg)",
                boxShadow: `4px 4px 0 ${INK}`,
              }}
            >
              ✕ Conflict
            </p>
          </div>
          <h1 style={{ margin: "1.75rem 0 0", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Merge conflict on our side
          </h1>
          <p style={{ margin: "0.75rem 0 0", fontSize: "1.05rem", lineHeight: 1.55, fontWeight: 500 }}>
            Try again in a moment. Your work is still on GitHub. FirstPR failed to load this page.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button type="button" onClick={reset} style={pill}>
              Retry
            </button>
            <Link href="/" style={pill}>
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
