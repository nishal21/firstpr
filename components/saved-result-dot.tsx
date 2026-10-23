/** Tiny grey corner mark when the API served a committed demo fixture. */
export function SavedResultDot({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;
  return (
    <span
      className={
        className ??
        "pointer-events-none absolute right-2.5 top-2.5 size-1.5 rounded-full bg-slate-300"
      }
      title="saved result"
      aria-label="saved result"
    />
  );
}
