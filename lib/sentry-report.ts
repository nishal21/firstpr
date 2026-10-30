// Small helpers so app code can report to Sentry without caring whether it is set up.
// Every call is a no-op when no DSN is configured.
import * as Sentry from "@sentry/nextjs";
import { CRON_MONITORS, monitorConfig } from "./cron-monitors.ts";

export type BotStage =
  | "pr-check"
  | "explain"
  | "labels"
  | "labels-refresh"
  | "label-sync"
  | "post-error-comment"
  | "triage"
  | "triage-label"
  | "webhook";

/** Report a caught error from the GitHub bot with the step it failed in. */
export function reportBotError(
  err: unknown,
  stage: BotStage,
  level: "error" | "warning" = "error",
  extra?: Record<string, string | number | undefined>,
): void {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setTag("bot.stage", stage);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined) scope.setTag(`bot.${key}`, String(value));
      }
    }
    Sentry.captureException(err);
  });
}

export type CronOutcome = "ok" | "error";

/**
 * Wrap a cron job in Sentry check-ins: `in_progress` first, then `ok` or `error`.
 * The job returns its Response plus whether the run counts as healthy.
 */
export async function runMonitoredCron(
  path: string,
  job: () => Promise<{ response: Response; outcome: CronOutcome }>,
): Promise<Response> {
  const monitor = CRON_MONITORS[path];
  if (!monitor) return (await job()).response;

  const config = monitorConfig(monitor);
  const checkInId = Sentry.captureCheckIn({ monitorSlug: monitor.slug, status: "in_progress" }, config);
  const started = Date.now();
  let outcome: CronOutcome = "error";
  try {
    const result = await job();
    outcome = result.outcome;
    return result.response;
  } finally {
    Sentry.captureCheckIn(
      {
        checkInId,
        monitorSlug: monitor.slug,
        status: outcome,
        duration: (Date.now() - started) / 1000,
      },
      config,
    );
    await Sentry.flush(2000);
  }
}

/** A single failed check-in, for runs that cannot start at all (for example a missing secret). */
export async function reportCronFailure(path: string): Promise<void> {
  const monitor = CRON_MONITORS[path];
  if (!monitor) return;
  Sentry.captureCheckIn({ monitorSlug: monitor.slug, status: "error" }, monitorConfig(monitor));
  await Sentry.flush(2000);
}