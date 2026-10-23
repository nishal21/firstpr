import { NextResponse } from "next/server";
import {
  friendlyErrorMessage,
  statusForErrorCode,
} from "@/lib/api-errors";
import {
  canWriteFixtures,
  getFixture,
  saveFixture,
} from "@/lib/cache";
import { getEnv } from "@/lib/env";
import { GitHubError } from "@/lib/github";
import { LlmError } from "@/lib/llm";

export type FirstPrSource = "live" | "cache";

export type DemoMode = "on" | "auto" | "off";

export function getDemoMode(): DemoMode {
  const raw = (getEnv().DEMO_MODE || "auto").trim().toLowerCase();
  if (raw === "on" || raw === "off" || raw === "auto") return raw;
  return "auto";
}

export function isRecoverableDemoError(err: unknown): boolean {
  if (err instanceof GitHubError && err.code === "rate_limited") return true;
  if (err instanceof LlmError) {
    return err.code === "timeout" || err.code === "provider_error";
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    return (
      code === "rate_limited" ||
      code === "timeout" ||
      code === "provider_error"
    );
  }
  return false;
}

export function errorCodeOf(err: unknown): string {
  if (err instanceof GitHubError || err instanceof LlmError) return err.code;
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return "github_error";
}

/**
 * DEMO_MODE=on → fixture if present, else live.
 * DEMO_MODE=auto → live; on rate_limited/timeout/provider_error → fixture.
 * Always records when RECORD_DEMO=1 (non-production).
 */
export async function withDemoFixture<T>(opts: {
  key: string;
  run: () => Promise<T>;
}): Promise<{ data: T; source: FirstPrSource }> {
  const mode = getDemoMode();

  if (mode === "on") {
    const fixture = getFixture<T>(opts.key);
    if (fixture !== null) {
      return { data: fixture, source: "cache" };
    }
  }

  try {
    const data = await opts.run();
    if (canWriteFixtures()) {
      saveFixture(opts.key, data);
    }
    return { data, source: "live" };
  } catch (err) {
    if (mode === "auto" || mode === "on") {
      if (isRecoverableDemoError(err)) {
        const fixture = getFixture<T>(opts.key);
        if (fixture !== null) {
          return { data: fixture, source: "cache" };
        }
      }
    }
    throw err;
  }
}

export function jsonWithSource<T>(
  data: T,
  source: FirstPrSource,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("x-firstpr-source", source);
  return NextResponse.json(data, { ...init, headers });
}

export function errorJson(err: unknown): NextResponse {
  const code = errorCodeOf(err);
  const raw =
    err instanceof Error ? err.message : "Unexpected error";
  const message = friendlyErrorMessage(code, raw);
  return NextResponse.json(
    { error: message, code },
    {
      status: statusForErrorCode(code),
      headers: { "x-firstpr-source": "live" },
    },
  );
}
