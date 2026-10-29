import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "FirstPR Explain: understand a GitHub issue and the files it touches";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    kicker: "Step 2 · Explain",
    display: "Understand the issue",
    line: "Paste a GitHub issue link and see the real files it touches. No patch written for you.",
    chips: ["real files", "plain summary", "hint ladder"],
    stamp: "Explained",
  });
}
