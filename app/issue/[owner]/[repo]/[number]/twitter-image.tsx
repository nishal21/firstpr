import { loadIssueMeta } from "@/lib/issue-meta";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "A GitHub issue explained on FirstPR";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ owner: string; repo: string; number: string }> };

export default async function Image({ params }: Props) {
  const raw = await params;
  const meta = await loadIssueMeta(raw.owner, raw.repo, raw.number);
  if (!meta) {
    return renderOgCard({
      kicker: "Explain",
      display: "Issue not found",
      line: "That link is not a GitHub issue FirstPR can open.",
      stamp: "Closed",
    });
  }
  return renderOgCard({
    kicker: `${meta.owner}/${meta.repo} #${meta.number}`,
    display: meta.title ?? `Issue #${meta.number}`,
    line: `What it asks for and which files in ${meta.repo} to read first.`,
    chips: meta.labels,
    stamp: "Explain",
    displayFont: "plain",
  });
}
