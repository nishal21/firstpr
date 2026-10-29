import { NextResponse } from "next/server";
import { inspectIssueAvailability } from "@/lib/availability";
import { errorJson } from "@/lib/demo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner")?.trim() ?? "";
  const repo = url.searchParams.get("repo")?.trim() ?? "";
  const number = Number(url.searchParams.get("number"));
  if (!owner || !repo || !Number.isFinite(number) || number < 1) {
    return NextResponse.json(
      { error: "Need owner, repo, and issue number.", code: "bad_request" },
      { status: 400 },
    );
  }
  try {
    const data = await inspectIssueAvailability(owner, repo, number);
    return NextResponse.json(data);
  } catch (err) {
    return errorJson(err);
  }
}
