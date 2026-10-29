import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_KEY_BACKUP: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-6-luna"),
  OPENAI_REVIEW_MODEL: z.string().default("gpt-6-luna"),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  FIRST_PASS_PROVIDER: z.string().default("openai"),
  NEYSA_GEMMA_KEY: z.string().optional(),
  NEYSA_GEMMA_URL: z.string().optional(),
  NEYSA_GEMMA_MODEL: z.string().optional(),
  NEYSA_QWEN_KEY: z.string().optional(),
  NEYSA_QWEN_URL: z.string().optional(),
  NEYSA_QWEN_MODEL: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  DEMO_REPO: z.string().default("nishal21/NekoDroid"),
  DEMO_USERNAME: z.string().default("nishal21"),
  DEMO_MODE: z.string().default("auto"),
  NEXT_PUBLIC_ALGOLIA_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: z.string().optional(),
  NEXT_PUBLIC_ALGOLIA_INDEX: z.string().default("good_first_issues"),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function readEnv(name: string): string | undefined {
  // Dynamic key access avoids Next/Turbopack inlining an empty value from boot time.
  const value = process.env[name];
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function loadEnv(): Env {
  const result = envSchema.safeParse({
    OPENAI_API_KEY: readEnv("OPENAI_API_KEY"),
    OPENAI_API_KEY_BACKUP: readEnv("OPENAI_API_KEY_BACKUP"),
    OPENAI_BASE_URL: readEnv("OPENAI_BASE_URL"),
    OPENAI_MODEL: readEnv("OPENAI_MODEL"),
    OPENAI_REVIEW_MODEL: readEnv("OPENAI_REVIEW_MODEL"),
    GITHUB_TOKEN: readEnv("GITHUB_TOKEN"),
    GITHUB_APP_ID: readEnv("GITHUB_APP_ID"),
    GITHUB_APP_PRIVATE_KEY: readEnv("GITHUB_APP_PRIVATE_KEY"),
    GITHUB_WEBHOOK_SECRET: readEnv("GITHUB_WEBHOOK_SECRET"),
    FIRST_PASS_PROVIDER: readEnv("FIRST_PASS_PROVIDER"),
    NEYSA_GEMMA_KEY: readEnv("NEYSA_GEMMA_KEY"),
    NEYSA_GEMMA_URL: readEnv("NEYSA_GEMMA_URL"),
    NEYSA_GEMMA_MODEL: readEnv("NEYSA_GEMMA_MODEL"),
    NEYSA_QWEN_KEY: readEnv("NEYSA_QWEN_KEY"),
    NEYSA_QWEN_URL: readEnv("NEYSA_QWEN_URL"),
    NEYSA_QWEN_MODEL: readEnv("NEYSA_QWEN_MODEL"),
    SERPAPI_KEY: readEnv("SERPAPI_KEY"),
    DEMO_REPO: readEnv("DEMO_REPO"),
    DEMO_USERNAME: readEnv("DEMO_USERNAME"),
    DEMO_MODE: readEnv("DEMO_MODE"),
    NEXT_PUBLIC_ALGOLIA_APP_ID: readEnv("NEXT_PUBLIC_ALGOLIA_APP_ID"),
    NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: readEnv("NEXT_PUBLIC_ALGOLIA_SEARCH_KEY"),
    NEXT_PUBLIC_ALGOLIA_INDEX: readEnv("NEXT_PUBLIC_ALGOLIA_INDEX"),
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: readEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN"),
  });

  if (!result.success) {
    throw new Error(`Invalid environment: ${result.error.message}`);
  }

  return result.data;
}

/** Soft-validated env. Secrets are optional here so builds succeed without them. */
export const env: Env = loadEnv();

/** Fresh read of process.env (avoids stale module-init / bundler-inlined empties). */
export function getEnv(): Env {
  return loadEnv();
}

/** Call when an OpenAI request is about to run (primary key required). */
export function requireOpenAIApiKey(): string {
  const key = getEnv().OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required");
  }
  return key;
}

/** Call when a GitHub API request is about to run. */
export function requireGitHubToken(): string {
  const token = getEnv().GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required");
  }
  return token;
}
