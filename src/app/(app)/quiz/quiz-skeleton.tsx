export function QuizSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-neutral-200" />
          <div className="h-3 w-40 rounded bg-neutral-200/70" />
        </div>
        <div className="h-8 w-20 rounded-md bg-neutral-200/70" />
      </div>
      <div className="mt-4 h-96 rounded-lg border border-neutral-200 bg-white" />
    </div>
  );
}
