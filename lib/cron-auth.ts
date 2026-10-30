import { timingSafeEqual } from "node:crypto";

/** Constant-time check of `Authorization: Bearer <secret>`. */
export function hasBearerSecret(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const left = Buffer.from(header);
  const right = Buffer.from(`Bearer ${secret}`);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Vercel Cron sends `user-agent: vercel-cron/1.0`. */
export function isVercelCron(request: Request): boolean {
  return (request.headers.get("user-agent") ?? "").toLowerCase().startsWith("vercel-cron");
}