import { formatPercent } from "@/lib/utils";
import type { TopicStat } from "@/lib/types";

export function TopicStats({ stats }: { stats: TopicStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          Completa qualche quiz per vedere le tue prestazioni per argomento.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {stats.map((stat) => {
        const percent = stat.total > 0 ? stat.correct / stat.total : 0;
        return (
          <li key={stat.topic}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium text-slate-800">
                {stat.topic}
              </p>
              <p className="shrink-0 text-xs text-slate-500">
                {stat.correct}/{stat.total} ·{" "}
                <span className="font-semibold text-slate-700">
                  {formatPercent(stat.correct, stat.total)}
                </span>
              </p>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`Precisione ${stat.topic}: ${formatPercent(stat.correct, stat.total)}`}
            >
              <div
                className={
                  percent >= 0.7
                    ? "h-full rounded-full bg-emerald-500"
                    : percent >= 0.5
                      ? "h-full rounded-full bg-amber-500"
                      : "h-full rounded-full bg-rose-500"
                }
                style={{ width: `${Math.max(percent * 100, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
