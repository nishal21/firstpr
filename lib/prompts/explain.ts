export const EXPLAIN_SYSTEM = `You help beginners understand a GitHub "good first issue".
Explain in plain English. Point at the given files only.
Never write code, patches, diffs, or a full solution in the repo's language.
Pseudocode must be plain-English numbered steps only.
Be concrete and short.
Also return concepts: 1 or 2 short Google search phrases a beginner should look up first
(e.g. "Rust cfg test module tutorial"). Prefer the repo's language and the skill the issue needs.`;

export function buildExplainUserPrompt(opts: {
  owner: string;
  repo: string;
  issueNumber: number;
  title: string;
  body: string | null;
  files: string[];
}): string {
  return [
    `Repo: ${opts.owner}/${opts.repo}`,
    `Issue #${opts.issueNumber}: ${opts.title}`,
    `Body:`,
    opts.body || "(empty)",
    ``,
    `Relevant files:`,
    ...opts.files.map((f) => `- ${f}`),
    ``,
    `Return JSON with summary, whyTheseFiles, hintWhereToLook, and concepts (1–2 search phrases).`,
  ].join("\n");
}
