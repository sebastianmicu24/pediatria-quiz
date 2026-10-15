import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: string;
  hint?: string;
  /**
   * Riga aggiuntiva sotto il hint. A differenza del hint va a capo invece di
   * essere troncata: serve ai valori testuali lunghi (es. nomi di materia).
   */
  detail?: string;
  /** `text` per valori in parole (corpo più piccolo del numero). */
  variant?: "metric" | "text";
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
          <dd
            className={cn(
              "mt-1.5 font-semibold tracking-tight text-neutral-900",
              item.variant === "text"
                ? "text-[15px] leading-snug"
                : "text-2xl tabular-nums"
            )}
          >
            {item.value}
          </dd>
          {item.hint ? (
            <p className="mt-1 truncate text-xs text-neutral-500">{item.hint}</p>
          ) : null}
          {item.detail ? (
            <p className="mt-0.5 text-xs leading-snug text-neutral-500">
              {item.detail}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
