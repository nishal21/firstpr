import { NextResponse } from "next/server";
import { getDemoMode } from "@/lib/demo";
import { getEnv } from "@/lib/env";
import { getRateLimit } from "@/lib/github";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const env = getEnv();

  let rate: { core: number; search: number };
  try {
    rate = await getRateLimit();
  } catch {
    rate = { core: 0, search: 0 };
  }

  return NextResponse.json({
    ok: true,
    demoMode: getDemoMode(),
    hasOpenAI: Boolean(env.OPENAI_API_KEY),
    hasGitHub: Boolean(env.GITHUB_TOKEN),
    rate,
  });
}
