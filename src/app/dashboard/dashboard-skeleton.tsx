export function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-9 w-64 rounded-lg bg-slate-200" />
      <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200/70" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-64 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-6 w-36 rounded bg-slate-200" />
          <div className="h-48 rounded-2xl border border-slate-200 bg-white" />
        </div>
        <div className="space-y-4">
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="h-80 rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
