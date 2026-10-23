import type { ExplainIssueResult } from "@/lib/explain";

const SITE_ORIGIN = "https://firstpr-coral.vercel.app";

/** Markdown reply for `/firstpr explain` on an issue. */
export function formatExplainWebhookComment(
  explained: ExplainIssueResult,
  level1Hint: string,
): string {
  const { owner, repo, issue, explanation, citations } = explained;
  const pageUrl = `${SITE_ORIGIN}/issue/${owner}/${repo}/${issue.number}`;

  const lines: string[] = [
    "## FirstPR explain",
    "",
    explanation.summary,
    "",
    "### Where to look",
  ];

  if (citations.length === 0) {
    lines.push("_No verified file citations yet — open the full page for more._");
  } else {
    for (const c of citations) {
      const range =
        c.start === c.end ? `L${c.start}` : `L${c.start}–L${c.end}`;
      lines.push(`- [\`${c.path}\` ${range}](${c.url}) — ${c.why}`);
    }
  }

  lines.push("", "### Done when");
  if (explanation.done_when.length === 0) {
    lines.push("- _(none listed)_");
  } else {
    for (const item of explanation.done_when) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", "### Hint (level 1)", level1Hint.trim() || "_Open the full page for hints._");

  lines.push(
    "",
    "---",
    `Full explanation (hints ladder, learn links): ${pageUrl}`,
    "",
    "_FirstPR never writes your fix. You write the PR._",
  );

  return lines.join("\n");
}

export function firstPrSiteOrigin(): string {
  return SITE_ORIGIN;
}
