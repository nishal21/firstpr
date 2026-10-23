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
        term: z.string(),
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
