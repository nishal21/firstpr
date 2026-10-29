import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contributor journey",
  description:
    "A private record, in this browser, of issues you matched, explanations you opened, and pull requests you scored.",
  alternates: { canonical: "/journey" },
};

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
