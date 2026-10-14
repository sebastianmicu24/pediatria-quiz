import { formatPercent } from "@/lib/utils";

export type TopicPieDatum = {
  topic: string;
  /** Domande svolte (con almeno una risposta). */
  done: number;
  /** Di cui corrette (ultima risposta data). */
  correct: number;
  /** Domande totali disponibili per la materia. */
  available: number;
};

/**
 * Diagramma a torta (ciambella) sul totale disponibile della materia:
 * verde = corrette, rosa = sbagliate, grigio = ancora da svolgere.
 */
function TopicPie({
  correct,
  wrong,
  available,
}: {
  correct: number;
  wrong: number;
  available: number;
}) {
  const radius = 15.9155; // circonferenza ≈ 100 → dasharray in percentuale
  const circumference = 2 * Math.PI * radius;
  const safe = available > 0 ? available : 1;
  const correctLen = circumference * (correct / safe);
  const wrongLen = circumference * (wrong / safe);

  return (
    <svg
      viewBox="0 0 40 40"
      className="h-14 w-14 shrink-0 -rotate-90"
      aria-hidden="true"
    >
      {/* Da svolgere */}
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="7"
      />
      {/* Corrette */}
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#10b981"
        strokeWidth="7"
        strokeDasharray={`${correctLen} ${circumference}`}
      />
      {/* Sbagliate (dopo le corrette) */}
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#fda4af"
        strokeWidth="7"
        strokeDasharray={`${wrongLen} ${circumference}`}
        strokeDashoffset={-correctLen}
      />
    </svg>
  );
}

export function TopicPies({ data }: { data: TopicPieDatum[] }) {
  const withQuestions = data.filter((datum) => datum.available > 0);

  if (withQuestions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          Nessuna materia disponibile: importa le domande per vedere qui la
          copertura per materia.
        </p>
      </div>
    );
  }

  const totalAvailable = withQuestions.reduce(
    (sum, datum) => sum + datum.available,
    0
  );
  const totalDone = withQuestions.reduce((sum, datum) => sum + datum.done, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {withQuestions.map((datum) => {
          const wrong = datum.done - datum.correct;
          const toDo = datum.available - datum.done;
          return (
            <li key={datum.topic} className="flex items-center gap-4 px-4 py-3.5">
              <TopicPie
                correct={datum.correct}
                wrong={wrong}
                available={datum.available}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {datum.topic}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Svolti: {datum.done}/{datum.available} (
                  {formatPercent(datum.done, datum.available)})
                </p>
                <p className="text-xs text-slate-500">
                  Corretti:{" "}
                  <span className="font-medium text-emerald-700">
                    {formatPercent(datum.correct, datum.available)}
                  </span>{" "}
                  · Sbagliati:{" "}
                  <span className="font-medium text-rose-700">
                    {formatPercent(wrong, datum.available)}
                  </span>{" "}
                  · Da svolgere: {formatPercent(toDo, datum.available)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          In totale: {totalDone} di {totalAvailable} svolti (
          {formatPercent(totalDone, totalAvailable)})
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
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-slate-200"
              aria-hidden="true"
            />
            Da svolgere
          </span>
        </p>
      </div>
    </div>
  );
}
