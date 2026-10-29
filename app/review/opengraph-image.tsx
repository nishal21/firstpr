import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "FirstPR Review: score your pull request before a maintainer does";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    kicker: "Step 3 · Review",
    display: "Check your PR first",
    line: "Score a pull request against the issue, CONTRIBUTING.md, and the diff before a maintainer does.",
    chips: ["issue fit", "CONTRIBUTING.md", "diff"],
    stamp: "Reviewed",
  });
}
