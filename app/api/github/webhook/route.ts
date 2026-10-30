import * as Sentry from "@sentry/nextjs";
import { after, NextResponse } from "next/server";
import { getGitHubApp } from "@/lib/github-app";

export const runtime = "nodejs";
export const maxDuration = 60;

type WebhookMeta = {
  action?: string;
  repo?: string;
  installationId?: number;
};

/** Pull only non-secret routing fields out of the payload for Sentry tags. */
function webhookMeta(payload: unknown): WebhookMeta {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as {
    action?: unknown;
    repository?: { full_name?: unknown };
    installation?: { id?: unknown };
  };
  return {
    action: typeof p.action === "string" ? p.action : undefined,
    repo: typeof p.repository?.full_name === "string" ? p.repository.full_name : undefined,
    installationId: typeof p.installation?.id === "number" ? p.installation.id : undefined,
  };
}

/** Octokit wraps handler failures in an AggregateError. Report each one. */
function handlerErrors(err: unknown): unknown[] {
  if (err instanceof AggregateError && err.errors.length > 0) return err.errors;
  const nested = (err as { errors?: unknown })?.errors;
  if (Array.isArray(nested) && nested.length > 0) return nested;
  return [err];
}

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
    Sentry.captureMessage("GitHub App is not configured", {
      level: "error",
      tags: { "github.event": name, "github.delivery": id, "bot.stage": "webhook" },
    });
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

  // Bad signatures are noise from scanners, so they are not sent to Sentry.
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid webhook signature", code: "unauthorized" },
      { status: 401 },
    );
  }

  console.log(`[webhook] accepted ${name} delivery=${id}`);

  // GitHub wants a reply within ~10s; do LLM work after the response.
  after(async () => {
    await Sentry.withIsolationScope(async (scope) => {
      let parsed: unknown;
      try {
        // Signature was checked above; parse once and hand the event over.
        parsed = JSON.parse(payload);
      } catch (err) {
        scope.setTag("github.event", name);
        scope.setTag("github.delivery", id);
        Sentry.captureException(err);
        await Sentry.flush(2000);
        return;
      }

      const meta = webhookMeta(parsed);
      scope.setTags({
        "github.event": name,
        "github.delivery": id,
        "github.action": meta.action ?? "none",
        "github.repo": meta.repo ?? "none",
        "github.installation_id": meta.installationId ?? "none",
      });
      scope.setContext("github", { event: name, action: meta.action, delivery: id });

      const label = meta.action ? `${name}.${meta.action}` : name;
      await Sentry.startSpan(
        { op: "webhook.github", name: `github webhook ${label}`, forceTransaction: true },
        async (span) => {
          try {
            await app.webhooks.receive({
              id,
              // Event name comes from GitHub; cast through unknown for Octokit unions.
              name: name as never,
              payload: parsed as never,
            });
            console.log(`[webhook] finished ${name} delivery=${id}`);
          } catch (err) {
            span.setStatus({ code: 2, message: "internal_error" });
            console.error(
              "[webhook] receive failed:",
              err instanceof Error ? err.message : err,
            );
            for (const inner of handlerErrors(err)) {
              Sentry.captureException(inner, { tags: { "bot.stage": "webhook" } });
            }
          }
        },
      );
      // Serverless functions can freeze right after this; send what is queued.
      await Sentry.flush(2000);
    });
  });

  return new NextResponse(null, { status: 202 });
}