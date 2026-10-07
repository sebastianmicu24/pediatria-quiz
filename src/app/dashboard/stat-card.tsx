import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
