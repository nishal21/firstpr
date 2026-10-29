import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newcomer-ready scorecard",
  description:
    "Score a public repo for license, contributing guide, issue templates, setup, and open beginner issues. The number is computed in code.",
  alternates: { canonical: "/ready" },
};

export default function ReadyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
