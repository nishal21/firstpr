import { NextResponse } from "next/server";
import { errorJson } from "@/lib/demo";
import { parseRepo } from "@/lib/github";
import { estimateRepoSetup } from "@/lib/setup";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const repoInput = url.searchParams.get("repo")?.trim() ?? "";
  if (!repoInput) {
    return NextResponse.json(
      { error: "Need a repo (owner/repo).", code: "bad_request" },
      { status: 400 },
    );
  }
  try {
    const { owner, repo } = parseRepo(repoInput);
    const data = await estimateRepoSetup(owner, repo);
    return NextResponse.json({ owner, repo, ...data });
  } catch (err) {
    return errorJson(err);
  }
}
