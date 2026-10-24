import { NextResponse } from "next/server";
import { hintFixtureKey } from "@/lib/cache";
import { parseContentLang } from "@/lib/content-lang";
import { errorJson, jsonWithSource, withDemoFixture } from "@/lib/demo";
import { GitHubError } from "@/lib/github";
import { ASKED_FOR_CODE_RE, getHint, type HintLevel } from "@/lib/hints";
import { LlmError } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

type HintBody = {
  owner?: string;
  repo?: string;
  number?: number;
  level?: number;
  userMessage?: string | null;
  previousHints?: string[];
  lang?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HintBody;
    const owner = body.owner?.trim();
    const repo = body.repo?.trim();
    const number = Number(body.number);
    const level = Number(body.level) as HintLevel;
    const lang = parseContentLang(body.lang);
    const userMessage = body.userMessage ?? null;
    const previousHints = Array.isArray(body.previousHints)
      ? body.previousHints.map(String)
      : [];

    if (!owner || !repo || !Number.isFinite(number) || number < 1) {
      return NextResponse.json(
        {
          error: "Provide owner, repo, and a positive number",
          code: "bad_request",
        },
        { status: 400, headers: { "x-firstpr-source": "live" } },
      );
    }

    if (level !== 1 && level !== 2 && level !== 3) {
      return NextResponse.json(
        { error: "level must be 1, 2, or 3", code: "bad_request" },
        { status: 400, headers: { "x-firstpr-source": "live" } },
      );
    }

    const askedForCode = Boolean(
      userMessage?.trim() && ASKED_FOR_CODE_RE.test(userMessage),
    );
    const key = hintFixtureKey(
      owner,
      repo,
      number,
      level,
      askedForCode,
      lang,
    );

    const { data, source } = await withDemoFixture({
      key,
      run: async () => {
        const result = await getHint({
          owner,
          repo,
          number,
          level,
          userMessage,
          previousHints,
          lang,
        });
        return {
          askedForCode: result.askedForCode,
          sha: result.sha,
          hint: result.hint,
          points: result.points,
        };
      },
    });

    return jsonWithSource(data, source);
  } catch (err) {
    if (err instanceof GitHubError || err instanceof LlmError) {
      return errorJson(err);
    }
    return errorJson(err);
  }
}
