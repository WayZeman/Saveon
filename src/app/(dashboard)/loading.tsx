export default function DashboardLoading() {
  return (
    <div className="animate-in fade-in duration-150 flex flex-col gap-6">
      <div className="h-10 w-64 rounded-xl bg-[var(--input-bg)]/70 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[var(--input-bg)]/50 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-[var(--input-bg)]/40 animate-pulse" />
      <div className="h-48 rounded-2xl bg-[var(--input-bg)]/40 animate-pulse" />
    </div>
  );
}
