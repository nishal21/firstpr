export default function RepoLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-4 h-10 w-2/3 max-w-md rounded bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="ink-card h-20" />
        <div className="ink-card h-20" />
        <div className="ink-card col-span-2 h-20" />
      </div>
    </div>
  );
}
