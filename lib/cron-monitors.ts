// One Sentry Cron Monitor per job in vercel.json.
// scripts/verify-cron-monitors.ts fails if a job is missing here or its schedule drifts.

export type CronMonitor = {
  /** Monitor slug in Sentry. Created on the first check-in. */
  slug: string;
  /** Must match the schedule in vercel.json. Vercel runs crons in UTC. */
  schedule: string;
};

export const CRON_MONITORS: Record<string, CronMonitor> = {
  "/api/cron/sync-issues": { slug: "algolia-sync-issues", schedule: "0 3 * * *" },
};

/** Sentry upsert config sent with each check-in. */
export function monitorConfig(monitor: CronMonitor) {
  return {
    schedule: { type: "crontab" as const, value: monitor.schedule },
    timezone: "Etc/UTC",
    // Vercel can start a job up to a few minutes late.
    checkinMargin: 15,
    // The route's maxDuration is 300s; anything past 10 minutes is stuck.
    maxRuntime: 10,
    failureIssueThreshold: 1,
    recoveryThreshold: 1,
  };
}