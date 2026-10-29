import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "FirstPR: find, understand, and review your first open-source pull request";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    kicker: "Match · Explain · Review",
    display: "Find your first PR",
    line: "Beginner GitHub issues, the files they touch, and a review before the maintainer sees it.",
    chips: ["good first issue", "no login", "AGPL-3.0"],
    stamp: "Merged",
  });
}
