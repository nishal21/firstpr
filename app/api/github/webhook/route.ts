import { after, NextResponse } from "next/server";
import { getGitHubApp } from "@/lib/github-app";

// runtime "nodejs" omitted: incompatible with nextConfig.cacheComponents (same as other APIs).
export const maxDuration = 60;

export async function POST(req: Request) {
  const id = req.headers.get("x-github-delivery");
  const name = req.headers.get("x-github-event");
  const signature = req.headers.get("x-hub-signature-256");

  if (!id || !name || !signature) {
    return NextResponse.json(
      { error: "Missing GitHub webhook headers", code: "unauthorized" },
      { status: 401 },
    );
  }

  let app;
  try {
    app = getGitHubApp();
  } catch (err) {
    console.error("[webhook] app not configured:", err);
    return NextResponse.json(
      { error: "GitHub App is not configured", code: "misconfigured" },
      { status: 503 },
    );
  }

  const payload = await req.text();

  let verified = false;
  try {
    verified = await app.webhooks.verify(payload, signature);
  } catch (err) {
    console.error("[webhook] verify threw:", err);
    verified = false;
  }

  if (!verified) {
    return NextResponse.json(
      { error: "Invalid webhook signature", code: "unauthorized" },
      { status: 401 },
    );
  }

  // GitHub wants a reply within ~10s; do LLM work after the response.
  after(async () => {
    try {
      await app.webhooks.verifyAndReceive({
        id,
        // Event name comes from GitHub; cast through unknown for Octokit unions.
        name: name as never,
        signature,
        payload,
      });
    } catch (err) {
      console.error(
        "[webhook] verifyAndReceive failed:",
        err instanceof Error ? err.message : err,
      );
    }
  });

  return new NextResponse(null, { status: 202 });
}
