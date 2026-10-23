/** True when `.` looks like a file extension (extract.py) not a sentence end. */
function isLikelyExtensionDot(text: string, i: number): boolean {
  const before = text[i - 1];
  const after = text[i + 1];
  if (!before || !after) return false;
  if (!/[A-Za-z0-9]/.test(before)) return false;
  if (!/[a-z]/i.test(after)) return false;
  // Next char after a short ext should be space, punctuation, or end — not a capital sentence start alone
  let j = i + 1;
  while (j < text.length && /[a-z0-9]/i.test(text[j])) j++;
  const ext = text.slice(i + 1, j);
  return ext.length >= 1 && ext.length <= 5;
}

/** Keep at most two sentences without splitting on file extensions. */
function clipToTwoSentences(text: string): string {
  let ends = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "!" || c === "?") {
      ends += 1;
      if (ends >= 2) return text.slice(0, i + 1).trim();
      continue;
    }
    if (c === ".") {
      if (isLikelyExtensionDot(text, i)) continue;
      ends += 1;
      if (ends >= 2) return text.slice(0, i + 1).trim();
    }
  }
  return text.trim();
}

/**
 * Turn model unsure_about into a short beginner "Heads up:" line, or null to hide.
 */
export function formatLimitsNotice(unsureAbout: string | null): string | null {
  let text = (unsureAbout ?? "").trim();
  if (!text) return null;

  if (
    /^(none|n\/a|nothing|no concerns?|not applicable)\.?$/i.test(text) ||
    /nothing (important|missing|to (note|flag|warn))/i.test(text) ||
    /^(i('m| am) )?confident\.?$/i.test(text)
  ) {
    return null;
  }

  text = text
    .replace(
      /\bwas not shown in the supplied source excerpts?\b/gi,
      "isn't in the files I could open",
    )
    .replace(
      /\bwere not shown in the supplied source excerpts?\b/gi,
      "aren't in the files I could open",
    )
    .replace(/\bin the supplied source excerpts?\b/gi, "in the files I could open")
    .replace(/\bsupplied source excerpts?\b/gi, "the files I could open")
    .replace(/\bsource excerpts?\b/gi, "files")
    .replace(/\bwas not shown\b/gi, "I couldn't see")
    .replace(/\bwere not shown\b/gi, "I couldn't see")
    .replace(/\bnot shown\b/gi, "missing")
    .replace(/\bwas not (provided|included|given)\b/gi, "I couldn't open")
    .replace(/\bwere not (provided|included|given)\b/gi, "I couldn't open")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();

  text = text.replace(/^heads up[,:]?\s*/i, "").trim();
  if (!text) return null;

  text = clipToTwoSentences(text);
  if (!text) return null;

  return `Heads up: ${text}`;
}
