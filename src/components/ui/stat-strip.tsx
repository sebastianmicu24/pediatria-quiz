import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: string;
  hint?: string;
};

/**
 * Striscia di indicatori: un unico riquadro con celle separate da filetti.
 * I numeri sono in cifre tabulari, senza icone decorative.
 */
export function StatStrip({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-200 bg-white",
        items.length === 3 && "lg:grid-cols-3",
        items.length >= 4 && "lg:grid-cols-4",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 border-neutral-200 px-4 py-4 sm:px-5",
            index % 2 === 1 && "border-l",
            index >= 2 && "border-t",
            "lg:border-t-0",
            index > 0 && "lg:border-l"
          )}
        >
          <dt className="text-xs font-medium text-neutral-500">{item.label}</dt>
          <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
            {item.value}
          </dd>
          {item.hint ? (
            <p className="mt-1 truncate text-xs text-neutral-500">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
