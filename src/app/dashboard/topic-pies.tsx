import type { TopicStat } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

/**
 * Diagramma a torta (ciambella) per una materia: la fetta verde è la
 * percentuale di risposte corrette (sull'ultima risposta per domanda),
 * la parte rosa le sbagliate.
 */
function TopicPie({ correct, total }: { correct: number; total: number }) {
  const radius = 15.9155; // circonferenza ≈ 100 → dasharray in percentuale
  const circumference = 2 * Math.PI * radius;
  const correctFraction = total > 0 ? correct / total : 0;

  return (
    <svg
      viewBox="0 0 40 40"
      className="h-14 w-14 shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#fda4af"
        strokeWidth="7"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#10b981"
        strokeWidth="7"
        strokeDasharray={`${circumference * correctFraction} ${circumference}`}
      />
    </svg>
  );
}

export function TopicPies({ stats }: { stats: TopicStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          Nessuna risposta ancora: completa la prima esercitazione per vedere
          qui le percentuali per materia.
        </p>
      </div>
    );
  }

  const totalAnswered = stats.reduce((sum, stat) => sum + stat.total, 0);
  const totalCorrect = stats.reduce((sum, stat) => sum + stat.correct, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {stats.map((stat) => {
          const wrong = stat.total - stat.correct;
          return (
            <li key={stat.topic} className="flex items-center gap-4 px-4 py-3.5">
              <TopicPie correct={stat.correct} total={stat.total} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {stat.topic}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Fatti: {stat.total} · Corretti:{" "}
                  <span className="font-medium text-emerald-700">
                    {formatPercent(stat.correct, stat.total)}
                  </span>{" "}
                  · Sbagliati:{" "}
                  <span className="font-medium text-rose-700">
                    {formatPercent(wrong, stat.total)}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          In totale: {totalAnswered} domande ·{" "}
          {formatPercent(totalCorrect, totalAnswered)} corrette
        </p>
        <p className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            Corrette
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-rose-300"
              aria-hidden="true"
            />
            Sbagliate
          </span>
        </p>
      </div>
    </div>
  );
}
