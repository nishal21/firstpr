/**
 * Optional per-repo settings for FirstPRbot, read from `.github/firstpr.yml`.
 *
 * Only a tiny YAML subset is supported (flat `key: value` lines plus one
 * nested `labels:` block), which is all the file needs. Anything unknown is
 * ignored, and a missing or broken file falls back to the defaults.
 */

export type BotConfig = {
  /** Set to false to stop FirstPRbot commenting on this repo. */
  enabled: boolean;
  /** Collapse older FirstPRbot comments from before the single-comment format. */
  minimizeOld: boolean;
  /** Treat a PR with no linked issue as not ready. */
  requireLinkedIssue: boolean;
  /** Labels to add. Empty string means "don't label". */
  labels: {
    firstTimer: string;
    needsIssue: string;
  };
};

export const BOT_CONFIG_PATH = ".github/firstpr.yml";

export const DEFAULT_BOT_CONFIG: BotConfig = {
  enabled: true,
  minimizeOld: true,
  requireLinkedIssue: true,
  labels: { firstTimer: "", needsIssue: "" },
};

function unquote(raw: string): string {
  const v = raw.trim();
  if (
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function toBool(raw: string, fallback: boolean): boolean {
  const v = unquote(raw).toLowerCase();
  if (["true", "yes", "on"].includes(v)) return true;
  if (["false", "no", "off"].includes(v)) return false;
  return fallback;
}

/** Labels are short GitHub label names; drop anything odd. */
function toLabel(raw: string): string {
  const v = unquote(raw);
  if (!v || v === "~" || v.toLowerCase() === "null") return "";
  return v.length <= 50 && !/[\r\n,]/.test(v) ? v : "";
}

export function parseBotConfig(text: string | null | undefined): BotConfig {
  const config: BotConfig = {
    ...DEFAULT_BOT_CONFIG,
    labels: { ...DEFAULT_BOT_CONFIG.labels },
  };
  if (!text) return config;

  let inLabels = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const noComment = rawLine.replace(/\s+#.*$/, "").replace(/^#.*$/, "");
    if (!noComment.trim()) continue;

    const nested = /^\s+/.test(noComment);
    const m = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(noComment);
    if (!m) continue;
    const key = m[1].toLowerCase().replace(/-/g, "_");
    const value = m[2];

    if (nested && inLabels) {
      if (key === "first_timer") config.labels.firstTimer = toLabel(value);
      if (key === "needs_issue") config.labels.needsIssue = toLabel(value);
      continue;
    }

    inLabels = false;
    if (key === "enabled") config.enabled = toBool(value, config.enabled);
    else if (key === "minimize_old")
      config.minimizeOld = toBool(value, config.minimizeOld);
    else if (key === "require_linked_issue")
      config.requireLinkedIssue = toBool(value, config.requireLinkedIssue);
    else if (key === "labels") inLabels = value.trim() === "";
  }
  return config;
}
