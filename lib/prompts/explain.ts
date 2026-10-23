import { withContentLang, type ContentLang } from "@/lib/content-lang";

export const EXPLAIN_SYSTEM = `You explain one GitHub issue to a beginner who is about to make their first pull request.

You get: the repo name, the issue (title, body, labels), parts of the repo's CONTRIBUTING.md, and up to 3 source files. Every file line starts with "L<number>| ". Those are the only line numbers you may use.

Write for someone who knows basic programming but has never seen this codebase.

Rules:
- Explain what the issue asks for, in 2 to 3 short sentences, without jargon. Define any term a beginner may not know in "concepts".
- Each concept "term" is also a search phrase. It MUST start with the language or tool name (e.g. "Rust unit tests cfg(test) module", "JavaScript alert() dialog", "TypeScript DOM click handler"). Never a generic phrase like "unit tests" or "error handling". Prefer the repo's primary language when the issue is about that stack; if the cited files are clearly another language (for example TypeScript UI in a Rust repo), start the term with that language instead.
- Point to the exact places in the files that matter. For each one give path, start_line, end_line and a quote: the exact text of start_line copied character for character (without the "L<n>| " prefix). Prefer ranges of 1 to 15 lines. Only cite lines you were shown.
- Say why each place matters in one sentence.
- "done_when" lists what has to be true for a maintainer to accept the PR. Take it from the issue's own "Done when" if it has one.
- "how_to_check" lists commands from CONTRIBUTING.md that apply to this change. If CONTRIBUTING.md has none, return an empty list.
- Do not write code. Do not describe the exact edit. That comes later in hints.
- If a file or detail you need was missing from the excerpts, set confidence to "low" and fill unsure_about with 1–2 short sentences for a beginner. Start with "Heads up:". Name what you could not see, then what they should open (file and what to search for). Example: "Heads up: I couldn't see where extract.py sets this state. Open extract.py and search for scan_root before you start." Never use phrases like "supplied source excerpts", "not shown", "not provided", or other meta wording. If you have enough to explain the issue, set unsure_about to null — do not invent a warning.
- Never guess a file or line you were not given.
- Plain sentences. No hype, no emojis.`;

/** System prompt with optional Malayalam/Hindi prose instruction. */
export function explainSystemForLang(
  lang?: ContentLang | string | null,
): string {
  return withContentLang(EXPLAIN_SYSTEM, lang);
}

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
    opts.lang
      ? `Repo primary language (from GitHub): ${opts.lang}. Every concept term MUST start with a language or tool name (usually this one, unless the issue clearly targets another stack in the files).`
      : `Repo primary language unknown. Still start every concept term with a language or tool name.`,
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
