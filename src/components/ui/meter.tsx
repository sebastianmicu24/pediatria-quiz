import { cn } from "@/lib/utils";

export type MeterSegment = {
  value: number;
  className: string;
};

/**
 * Barra orizzontale sottile. Con `segments` mostra una barra impilata
 * (es. corrette / sbagliate / da svolgere) sul totale `max`.
 */
export function Meter({
  value,
  max = 100,
  segments,
  label,
  className,
  barClassName = "bg-brand-600",
}: {
  value?: number;
  max?: number;
  segments?: MeterSegment[];
  label?: string;
  className?: string;
  barClassName?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-200",
        className
      )}
    >
      {segments ? (
        segments.map((segment, index) => (
          <span
            key={index}
            className={segment.className}
            style={{ width: `${Math.min(100, (segment.value / safeMax) * 100)}%` }}
          />
        ))
      ) : (
        <span
          className={cn("rounded-full", barClassName)}
          style={{
            width: `${Math.min(100, Math.max(0, ((value ?? 0) / safeMax) * 100))}%`,
          }}
        />
      )}
    </div>
  );
}
