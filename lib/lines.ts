/** Split on newlines without dropping a trailing empty line oddly. */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** Trim and collapse all whitespace runs to a single space. */
export function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Return lines `start`..`end` (1-based, inclusive) prefixed as `L<n>| `.
 * Defaults to the whole file.
 */
export function numberLines(
  text: string,
  start = 1,
  end?: number,
): string {
  const lines = splitLines(text);
  if (lines.length === 0) return "";
  const from = Math.max(1, start);
  const to = Math.min(lines.length, end ?? lines.length);
  if (from > to) return "";

  const out: string[] = [];
  for (let n = from; n <= to; n++) {
    out.push(`L${n}| ${lines[n - 1]}`);
  }
  return out.join("\n");
}

/**
 * Slice of the file centered on `line`, with numbered text.
 */
export function windowAround(
  text: string,
  line: number,
  radius = 40,
): { start: number; end: number; numbered: string } {
  const lines = splitLines(text);
  const total = lines.length;
  if (total === 0) {
    return { start: 1, end: 1, numbered: "" };
  }
  const focus = Math.min(Math.max(1, line), total);
  const start = Math.max(1, focus - radius);
  const end = Math.min(total, focus + radius);
  return { start, end, numbered: numberLines(text, start, end) };
}

/**
 * GitHub blob permalink. Single-line refs use `#L{n}`; ranges use `#L{a}-L{b}`.
 */
export function permalink(
  owner: string,
  repo: string,
  sha: string,
  path: string,
  start: number,
  end: number,
): string {
  const base = `https://github.com/${owner}/${repo}/blob/${sha}/${path}`;
  if (start === end) return `${base}#L${start}`;
  return `${base}#L${start}-L${end}`;
}

export type CitationInput = {
  start_line: number;
  end_line: number;
  quote: string;
};

export type CitationResult = {
  ok: boolean;
  start: number;
  end: number;
  reason: string;
};

const MAX_QUOTE_SPAN_LINES = 80;

function findQuoteRange(
  lines: string[],
  quoteNorm: string,
): { start: number; end: number } | null {
  if (!quoteNorm || lines.length === 0) return null;

  for (let start = 1; start <= lines.length; start++) {
    const spanEnd = Math.min(lines.length, start + MAX_QUOTE_SPAN_LINES - 1);
    for (let end = start; end <= spanEnd; end++) {
      const region = collapseWhitespace(
        lines.slice(start - 1, end).join("\n"),
      );
      if (region.includes(quoteNorm)) {
        return { start, end };
      }
    }
  }
  return null;
}

function rangesWithin30(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  if (bEnd < aStart) return aStart - bEnd <= 30;
  if (aEnd < bStart) return bStart - aEnd <= 30;
  return true;
}

/**
 * Check that a model citation's quote actually appears at the claimed lines.
 * If the quote is nearby (within 30 lines), return corrected lines with reason "moved".
 */
export function verifyCitation(
  fileText: string,
  citation: CitationInput,
): CitationResult {
  const lines = splitLines(fileText);
  const total = lines.length;
  const quoteNorm = collapseWhitespace(citation.quote);
  const start = citation.start_line;
  const end = citation.end_line;

  if (total === 0) {
    return { ok: false, start, end, reason: "empty_file" };
  }
  if (!quoteNorm) {
    return { ok: false, start, end, reason: "empty_quote" };
  }
  if (!(1 <= start && start <= end && end <= total)) {
    const found = findQuoteRange(lines, quoteNorm);
    if (
      found &&
      rangesWithin30(start, end, found.start, found.end)
    ) {
      return {
        ok: true,
        start: found.start,
        end: found.end,
        reason: "moved",
      };
    }
    return {
      ok: false,
      start,
      end,
      reason: "out_of_range",
    };
  }

  const claimed = collapseWhitespace(lines.slice(start - 1, end).join("\n"));
  if (claimed.includes(quoteNorm)) {
    return { ok: true, start, end, reason: "ok" };
  }

  const found = findQuoteRange(lines, quoteNorm);
  if (
    found &&
    rangesWithin30(start, end, found.start, found.end)
  ) {
    return {
      ok: true,
      start: found.start,
      end: found.end,
      reason: "moved",
    };
  }

  return {
    ok: false,
    start,
    end,
    reason: found ? "quote_elsewhere" : "quote_not_found",
  };
}
