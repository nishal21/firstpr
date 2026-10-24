import { NextResponse } from "next/server";
import { explainFixtureKey } from "@/lib/cache";
import { parseContentLang } from "@/lib/content-lang";
import { errorJson, jsonWithSource, withDemoFixture } from "@/lib/demo";
import { explainIssueCached } from "@/lib/explain";
import { GitHubError } from "@/lib/github";
import { LlmError } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExplainBody = {
  owner?: string;
  repo?: string;
  number?: number;
  issueNumber?: number;
  lang?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExplainBody;
    const owner = body.owner?.trim();
    const repo = body.repo?.trim();
    const number = Number(body.number ?? body.issueNumber);
    const lang = parseContentLang(body.lang);

    if (!owner || !repo || !Number.isFinite(number) || number < 1) {
      return NextResponse.json(
        {
          error: "Provide owner, repo, and a positive number",
          code: "bad_request",
        },
        { status: 400, headers: { "x-firstpr-source": "live" } },
      );
    }

    const key = explainFixtureKey(owner, repo, number, lang);
    const { data, source } = await withDemoFixture({
      key,
      run: async () => {
        const result = await explainIssueCached({
          owner,
          repo,
          number,
          lang,
        });
        return {
          owner: result.owner,
          repo: result.repo,
          sha: result.sha,
          language: result.language,
          issue: {
            number: result.issue.number,
            title: result.issue.title,
            body: result.issue.body,
            htmlUrl: result.issue.htmlUrl,
            labels: result.issue.labels,
          },
          explanation: result.explanation,
          citations: result.citations,
          droppedCitations: result.droppedCitations,
          learn: result.learn,
          difficulty: result.difficulty,
          difficultyBadge: result.difficultyBadge,
          difficultyReason: result.difficultyReason,
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
