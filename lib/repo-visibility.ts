/**
 * Pasted repos only show issues when GitHub says the repo is public.
 * Anything else (private, internal, or a missing field) counts as not public.
 */
export function isPublicRepoData(
  data: { private?: boolean | null; visibility?: string | null } | null | undefined,
): boolean {
  if (!data || data.private !== false) return false;
  return (data.visibility ?? "public") === "public";
}
