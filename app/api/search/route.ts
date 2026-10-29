import { NextResponse } from "next/server";
import { z } from "zod";
import { errorJson } from "@/lib/demo";
import { isAlgoliaConfigured, searchBeginnerIssues } from "@/lib/issue-search";

export const runtime = "nodejs";

const bodySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

export async function GET() {
  return NextResponse.json({ algolia: isAlgoliaConfigured() });
}

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter at least 2 characters.", code: "bad_request" },
        { status: 400 },
      );
    }
    const data = await searchBeginnerIssues(parsed.data.q);
    return NextResponse.json(data);
  } catch (err) {
    return errorJson(err);
  }
}
