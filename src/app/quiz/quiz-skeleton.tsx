export function QuizSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 rounded-full bg-slate-200" />
        <div className="h-4 w-28 rounded bg-slate-200/70" />
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-slate-200/70" />
      <div className="mt-6 h-72 rounded-3xl border border-slate-200 bg-white" />
      <div className="mt-4 h-52 rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
