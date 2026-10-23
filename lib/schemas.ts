import { z } from "zod";

/**
 * Model output schemas for FirstPR.
 *
 * OpenAI structured outputs require every object property to be listed in
 * `required`. Prefer `.nullable()` over `.optional()` so the key is always
 * present (null when absent).
 */

export const pickFilesSchema = z.object({
  files: z.array(z.string()).max(5),
});

export type PickFilesOutput = z.infer<typeof pickFilesSchema>;

/** Step B first_pass pick: paths + one-line why (lib/pickFiles.ts). */
export const firstPassPickSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string(),
        why: z.string(),
      }),
    )
    .max(3),
});

export type FirstPassPickOutput = z.infer<typeof firstPassPickSchema>;

/** Explain schema — Product system prompts (BUILD-PLAN §4), word for word. */
export const explainSchema = z.object({
  summary: z.string().describe("2-3 plain sentences: what the issue asks for"),
  why_it_matters: z.string().describe("1-2 sentences: who it helps and why"),
  files: z
    .array(
      z.object({
        path: z.string(),
        start_line: z.number().int(),
        end_line: z.number().int(),
        quote: z
          .string()
          .describe("exact text of start_line, without the L<n>| prefix"),
        why: z.string().describe("one sentence"),
      }),
    )
    .max(5),
  concepts: z
    .array(
      z.object({
        term: z
          .string()
          .describe(
            'search phrase starting with language/tool, e.g. "Rust unit tests cfg(test) module"',
          ),
        explanation: z.string().describe("one beginner-friendly sentence"),
      }),
    )
    .max(5),
  done_when: z.array(z.string()).max(6),
  how_to_check: z.array(z.string()).describe("commands from CONTRIBUTING.md"),
  confidence: z.enum(["high", "medium", "low"]),
  unsure_about: z.string().nullable(),
});

export type ExplainOutput = z.infer<typeof explainSchema>;

/** Hint schema — Product system prompts (BUILD-PLAN §4), word for word. */
export const hintSchema = z.object({
  refused: z.boolean(),
  refusal_message: z.string().nullable(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  hint: z.string().describe("1-3 sentences, no code"),
  pseudocode: z
    .array(z.string())
    .nullable()
    .describe("level 3 only: up to 6 plain-English steps"),
  points_to: z
    .array(
      z.object({
        path: z.string(),
        start_line: z.number().int(),
        end_line: z.number().int(),
      }),
    )
    .max(3),
  check_yourself: z.string(),
});

export type HintOutput = z.infer<typeof hintSchema>;

/**
 * Review schema — BUILD-PLAN §4 base, plus required contributing_rules
 * (status + nullable detail) so structured outputs always include it.
 */
export const reviewSchema = z.object({
  summary: z.string(),
  checklist: z
    .array(
      z.object({
        id: z.enum(["issue_done_when", "contributing_rules"]),
        label: z.string(),
        status: z.enum(["pass", "warn", "fail"]),
        evidence: z.string().describe("what in the PR or diff shows this"),
        fix: z
          .string()
          .nullable()
          .describe("what to do next, in words; null when pass"),
      }),
    )
    .min(1)
    .max(2),
  /** Required: CONTRIBUTING.md judgment (never omit). */
  contributing_rules: z.object({
    status: z.enum(["pass", "warn", "fail"]),
    detail: z
      .string()
      .nullable()
      .describe("what in CONTRIBUTING.md or the PR shows this; null if nothing to say"),
  }),
  line_comments: z
    .array(
      z.object({
        path: z.string(),
        line: z.number().int(),
        severity: z.enum(["blocker", "suggestion", "nit"]),
        comment: z.string(),
      }),
    )
    .max(6),
  questions_a_maintainer_would_ask: z.array(z.string()).max(3),
  encouragement: z.string(),
});

export type ReviewOutput = z.infer<typeof reviewSchema>;
