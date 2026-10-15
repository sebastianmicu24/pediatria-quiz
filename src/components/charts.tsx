import { cn } from "@/lib/utils";

export type DailyPoint = {
  /** Etichetta breve (es. "15 ott"). */
  label: string;
  /** Etichetta estesa per tooltip e descrizione accessibile. */
  title: string;
  value: number;
};

/**
 * Istogramma giornaliero in puro CSS. Un solo colore (rosso del brand):
 * i giorni senza attività restano una linea sottile sul fondo.
 */
export function DailyBars({
  data,
  unit,
  className,
}: {
  data: DailyPoint[];
  unit: string;
  className?: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const middle = data[Math.floor(data.length / 2)];

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${total} ${unit} negli ultimi ${data.length} giorni`}
        className="relative mt-5 flex h-32 items-end gap-[3px] border-b border-neutral-200"
      >
        <span
          className="pointer-events-none absolute -top-5 left-0 text-[11px] tabular-nums text-neutral-400"
          aria-hidden="true"
        >
          {max}
        </span>
        {data.map((point) => (
          <div
            key={point.title}
            title={`${point.title}: ${point.value} ${unit}`}
            className="flex h-full flex-1 items-end"
          >
            <div
              className={cn(
                "w-full rounded-t-[2px]",
                point.value > 0 ? "bg-brand-600" : "bg-neutral-200"
              )}
              style={{
                height:
                  point.value > 0
                    ? `${Math.max((point.value / max) * 100, 4)}%`
                    : "2px",
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-1.5 flex justify-between text-[11px] tabular-nums text-neutral-400"
        aria-hidden="true"
      >
        <span>{data[0]?.label}</span>
        <span>{middle?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/**
 * Andamento della precisione nelle ultime esercitazioni (dalla meno alla più
 * recente). Linea sottile con griglia a 0 / 50 / 100%.
 */
export function PrecisionTrend({
  values,
  className,
}: {
  /** Percentuali 0–100, in ordine cronologico. */
  values: number[];
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <p
        className={cn(
          "flex h-32 items-center justify-center text-center text-sm text-neutral-500",
          className
        )}
      >
        Servono almeno due esercitazioni per mostrare l&apos;andamento.
      </p>
    );
  }

  const step = 100 / (values.length - 1);
  const points = values
    .map((value, index) => `${(index * step).toFixed(2)},${(100 - value).toFixed(2)}`)
    .join(" ");
  const last = values[values.length - 1];

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`Precisione nelle ultime ${values.length} esercitazioni: da ${values[0]}% a ${last}%`}
        className="relative h-32 pl-9"
      >
        {[100, 50, 0].map((tick) => (
          <span
            key={tick}
            className="absolute left-0 -translate-y-1/2 text-[11px] tabular-nums text-neutral-400"
            style={{ top: `${100 - tick}%` }}
            aria-hidden="true"
          >
            {tick}%
          </span>
        ))}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {[0, 50, 100].map((tick) => (
            <line
              key={tick}
              x1="0"
              x2="100"
              y1={100 - tick}
              y2={100 - tick}
              stroke="#e5e5e5"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={tick === 50 ? "3 3" : undefined}
            />
          ))}
          <polyline
            points={points}
            fill="none"
            stroke="#ae1c33"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div
        className="mt-1.5 flex justify-between pl-9 text-[11px] text-neutral-400"
        aria-hidden="true"
      >
        <span>{values.length} esercitazioni fa</span>
        <span>ultima</span>
      </div>
    </div>
  );
}
