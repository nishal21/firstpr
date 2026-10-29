import { NextResponse } from "next/server";
import { z } from "zod";
import { errorJson } from "@/lib/demo";
import { parseRepo } from "@/lib/github";
import { buildReadyReport } from "@/lib/ready";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  repo: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Need a public repo (owner/repo).", code: "bad_request" },
        { status: 400 },
      );
    }
    const { owner, repo } = parseRepo(parsed.data.repo);
    const data = await buildReadyReport(owner, repo);
    return NextResponse.json(data);
  } catch (err) {
    return errorJson(err);
  }
}
