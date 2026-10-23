import { NextResponse } from "next/server";
import {
  GitHubError,
  getIssue,
  getRepo,
  getTree,
  parseRepo,
} from "@/lib/github";
import { generateJson, LlmError } from "@/lib/llm";
import { pickFiles } from "@/lib/neysa";
import { buildExplainUserPrompt, EXPLAIN_SYSTEM } from "@/lib/prompts/explain";
import { explainSchema } from "@/lib/schemas";
import { learnLinks, type LearnLink } from "@/lib/serp";

export const maxDuration = 60;

type ExplainBody = {
  owner?: string;
  repo?: string;
  issueNumber?: number;
  repoFullName?: string;
};

function permalink(
  owner: string,
  repo: string,
  sha: string,
  path: string,
): string {
  return `https://github.com/${owner}/${repo}/blob/${sha}/${path}`;
}

function fallbackConcepts(title: string, languageHint: string | null): string[] {
  const lang = languageHint || "programming";
  const clipped = title.replace(/[^\w\s-]/g, " ").trim().slice(0, 60);
  return [`${lang} ${clipped} tutorial`.trim()].slice(0, 2);
}

async function gatherLearnLinks(concepts: string[]): Promise<LearnLink[]> {
  const seen = new Set<string>();
  const out: LearnLink[] = [];

  for (const concept of concepts.slice(0, 2)) {
    const links = await learnLinks(concept);
    for (const link of links) {
      if (seen.has(link.link)) continue;
      seen.add(link.link);
      out.push(link);
      if (out.length >= 3) return out;
    }
  }

  return out;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExplainBody;
    let owner = body.owner?.trim();
    let repo = body.repo?.trim();
    const issueNumber = Number(body.issueNumber);

    if ((!owner || !repo) && body.repoFullName) {
      const parsed = parseRepo(body.repoFullName);
      owner = parsed.owner;
      repo = parsed.repo;
    }

    if (!owner || !repo || !Number.isFinite(issueNumber) || issueNumber < 1) {
      return NextResponse.json(
        {
          error: "Provide owner, repo, and a positive issueNumber",
          code: "bad_request",
        },
        { status: 400 },
      );
    }

    const [repoInfo, issue] = await Promise.all([
      getRepo(owner, repo),
      getIssue(owner, repo, issueNumber),
    ]);

    const tree = await getTree(owner, repo, repoInfo.headSha);
    const picked = await pickFiles(issue.title, issue.body ?? "", tree);

    let explanation = {
      summary: issue.title,
      whyTheseFiles:
        picked.files.length > 0
          ? "These files are the most likely places to start for this issue."
          : "No files were confidently matched; open the issue and explore the repo tree.",
      hintWhereToLook:
        picked.files[0] != null
          ? `Start by opening ${picked.files[0]} and searching for symbols named in the issue.`
          : "Start from the issue description and the repo README.",
      concepts: fallbackConcepts(issue.title, repoInfo.language),
    };

    if (picked.files.length > 0) {
      try {
        explanation = await generateJson({
          task: "explain",
          system: EXPLAIN_SYSTEM,
          user: buildExplainUserPrompt({
            owner,
            repo,
            issueNumber,
            title: issue.title,
            body: issue.body,
            files: picked.files,
          }),
          schema: explainSchema,
          schemaName: "explain_issue",
          effort: "low",
        });
      } catch (err) {
        console.warn(
          "[explain] LLM explain failed; using fallback copy:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    const learn = await gatherLearnLinks(explanation.concepts);

    return NextResponse.json({
      owner,
      repo,
      headSha: repoInfo.headSha,
      defaultBranch: repoInfo.defaultBranch,
      issue: {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        htmlUrl: issue.htmlUrl,
        labels: issue.labels,
      },
      files: picked.files.map((path) => ({
        path,
        htmlUrl: permalink(owner, repo, repoInfo.headSha, path),
      })),
      filePickSource: picked.source,
      explanation,
      learn: learn.length > 0 ? learn : null,
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      const status =
        err.code === "rate_limited" ? 429 : err.code === "not_found" ? 404 : 502;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    if (err instanceof LlmError) {
      const status = err.code === "timeout" ? 504 : 502;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unexpected error",
        code: "github_error",
      },
      { status: 500 },
    );
  }
}
