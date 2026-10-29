"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root-level crash UI (replaces the root layout). Keep English and inline
 * styles so it still works when providers fail.
 */
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
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: "#ffffff",
          color: "#131e30",
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            margin: "0 auto",
            padding: "4rem 1.25rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#0473fd",
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            We hit a snag
          </h1>
          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "1rem",
              lineHeight: 1.55,
              color: "#5b6577",
            }}
          >
            Try again in a moment. Your work is still on GitHub. FirstPR failed
            to load this page.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: "2.75rem",
                padding: "0 1.25rem",
                border: "none",
                borderRadius: "0.75rem",
                background: "#0473fd",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "0.75rem",
                border: "1px solid #e3e8ef",
                color: "#131e30",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
