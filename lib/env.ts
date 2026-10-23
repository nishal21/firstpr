import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-6-luna"),
  OPENAI_REVIEW_MODEL: z.string().default("gpt-6-luna"),
  GITHUB_TOKEN: z.string().optional(),
  FIRST_PASS_PROVIDER: z.string().default("openai"),
  NEYSA_BASE_URL: z.string().optional(),
  NEYSA_API_KEY: z.string().optional(),
  NEYSA_MODEL: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  DEMO_REPO: z.string().default("nishal21/NekoDroid"),
  DEMO_MODE: z.string().default("auto"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_REVIEW_MODEL: process.env.OPENAI_REVIEW_MODEL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    FIRST_PASS_PROVIDER: process.env.FIRST_PASS_PROVIDER,
    NEYSA_BASE_URL: process.env.NEYSA_BASE_URL,
    NEYSA_API_KEY: process.env.NEYSA_API_KEY,
    NEYSA_MODEL: process.env.NEYSA_MODEL,
    SERPAPI_KEY: process.env.SERPAPI_KEY,
    DEMO_REPO: process.env.DEMO_REPO,
    DEMO_MODE: process.env.DEMO_MODE,
  });

  if (!result.success) {
    throw new Error(`Invalid environment: ${result.error.message}`);
  }

  return result.data;
}

/** Soft-validated env. Secrets are optional here so builds succeed without them. */
export const env: Env = loadEnv();

/** Call when an OpenAI request is about to run. */
export function requireOpenAIApiKey(): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }
  return env.OPENAI_API_KEY;
}

/** Call when a GitHub API request is about to run. */
export function requireGitHubToken(): string {
  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is required");
  }
  return env.GITHUB_TOKEN;
}
