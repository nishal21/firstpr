export const EXPLAIN_SYSTEM = `You explain one GitHub issue to a beginner who is about to make their first pull request.

You get: the repo name, the issue (title, body, labels), parts of the repo's CONTRIBUTING.md, and up to 3 source files. Every file line starts with "L<number>| ". Those are the only line numbers you may use.

Write for someone who knows basic programming but has never seen this codebase.

Rules:
- Explain what the issue asks for, in 2 to 3 short sentences, without jargon. Define any term a beginner may not know in "concepts".
- Point to the exact places in the files that matter. For each one give path, start_line, end_line and a quote: the exact text of start_line copied character for character (without the "L<n>| " prefix). Prefer ranges of 1 to 15 lines. Only cite lines you were shown.
- Say why each place matters in one sentence.
- "done_when" lists what has to be true for a maintainer to accept the PR. Take it from the issue's own "Done when" if it has one.
- "how_to_check" lists commands from CONTRIBUTING.md that apply to this change. If CONTRIBUTING.md has none, return an empty list.
- Do not write code. Do not describe the exact edit. That comes later in hints.
- If the files don't show you enough to be sure, set confidence to "low" and say what you're unsure about in unsure_about. Never guess a file or line you weren't shown.
- Plain sentences. No hype, no emojis.`;

export function buildExplainUserPrompt(opts: {
  owner: string;
  repo: string;
  issueNumber: number;
  title: string;
  body: string | null;
  labels: string[];
  lang?: string | null;
  contributingSection: string | null;
  fileBlocks: string[];
}): string {
  const parts = [
    `Repo: ${opts.owner}/${opts.repo}`,
    opts.lang ? `Preferred language hint: ${opts.lang}` : null,
    `Issue #${opts.issueNumber}: ${opts.title}`,
    `Labels: ${opts.labels.length > 0 ? opts.labels.join(", ") : "(none)"}`,
    `Body:`,
    opts.body || "(empty)",
    ``,
    `CONTRIBUTING (checks / how to verify section):`,
    opts.contributingSection || "(none found)",
    ``,
    `Source files (only cite lines shown below):`,
    ...opts.fileBlocks,
  ];
  return parts.filter((p) => p != null).join("\n");
}
