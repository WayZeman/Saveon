export default function DashboardLoading() {
  return (
    <div className="animate-in fade-in duration-150 flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="mono-hero h-36 animate-pulse opacity-60" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse opacity-50" />
        ))}
      </div>
      <div className="card h-64 animate-pulse opacity-40" />
      <div className="card h-48 animate-pulse opacity-40" />
    </div>
  );
}
