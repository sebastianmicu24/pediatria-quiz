import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Pagina di stato (404, errori): sobria, allineata a sinistra. */
export function StatusPage({
  code,
  title,
  children,
  actions,
  className,
}: {
  code?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-xl px-4 py-20 sm:px-6 sm:py-28", className)}
    >
      {code ? (
        <p className="text-sm font-medium tabular-nums text-brand-700">{code}</p>
      ) : null}
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        {title}
      </h1>
      {children ? (
        <div className="mt-4 text-base leading-relaxed text-neutral-600">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
      ) : null}
    </div>
  );
}
