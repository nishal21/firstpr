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

export const explainSchema = z.object({
  summary: z.string(),
  whyTheseFiles: z.string(),
  hintWhereToLook: z.string(),
  /** 1–2 short Google search phrases for beginner tutorials. */
  concepts: z.array(z.string()).min(1).max(2),
});

export type ExplainOutput = z.infer<typeof explainSchema>;
