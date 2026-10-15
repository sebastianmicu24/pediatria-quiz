import { Meter } from "@/components/ui/meter";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";
import type { TopicCoverageDatum } from "@/lib/types";

/**
 * Copertura per argomento sul totale disponibile: la barra impilata mostra
 * corrette, sbagliate e ancora da svolgere (parte vuota).
 */
export function TopicCoverage({ data }: { data: TopicCoverageDatum[] }) {
  const rows = data.filter((datum) => datum.available > 0);

  if (rows.length === 0) {
    return (
      <EmptyState>
        Nessun argomento disponibile: importa le domande per vedere qui la
        copertura.
      </EmptyState>
    );
  }

  const totalAvailable = rows.reduce((sum, row) => sum + row.available, 0);
  const totalDone = rows.reduce((sum, row) => sum + row.done, 0);

  return (
    <div>
      <div
        className="hidden grid-cols-[minmax(0,13rem)_1fr_5.5rem_4.5rem] gap-x-4 border-b border-neutral-200 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-400 sm:grid"
        aria-hidden="true"
      >
        <span>Argomento</span>
        <span>Copertura</span>
        <span className="text-right">Svolte</span>
        <span className="text-right">Precisione</span>
      </div>

      <ul className="divide-y divide-neutral-100">
        {rows.map((row) => {
          const wrong = row.done - row.correct;
          return (
            <li
              key={row.topic}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,13rem)_1fr_5.5rem_4.5rem]"
            >
              <p className="truncate text-sm font-medium text-neutral-900">
                {row.topic}
              </p>
              <p className="text-right text-sm tabular-nums text-neutral-900 sm:order-4">
                {row.done > 0 ? formatPercent(row.correct, row.done) : "—"}
              </p>
              <Meter
                className="col-span-2 sm:order-2 sm:col-span-1"
                max={row.available}
                label={`${row.correct} corrette, ${wrong} sbagliate, ${
                  row.available - row.done
                } da svolgere`}
                segments={[
                  { value: row.correct, className: "bg-emerald-600" },
                  { value: wrong, className: "bg-brand-500" },
                ]}
              />
              <p className="col-span-2 text-xs tabular-nums text-neutral-500 sm:order-3 sm:col-span-1 sm:text-right">
                {formatNumber(row.done)}/{formatNumber(row.available)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3 text-xs text-neutral-500">
        <p className="tabular-nums">
          In totale {formatNumber(totalDone)} di {formatNumber(totalAvailable)}{" "}
          domande svolte ({formatPercent(totalDone, totalAvailable)})
        </p>
        <ul className="flex items-center gap-4" aria-label="Legenda">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
            Corrette
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
            Sbagliate
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-neutral-300" aria-hidden="true" />
            Da svolgere
          </li>
        </ul>
      </div>
    </div>
  );
}
