export function AccountSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-9 w-40 rounded-lg bg-slate-200" />
      <div className="mt-3 h-5 w-80 max-w-full rounded bg-slate-200/70" />
      <div className="mt-8 space-y-6">
        <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-44 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-40 rounded-2xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
