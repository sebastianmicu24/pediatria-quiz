import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
        Informazioni legali
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-neutral-500">
        Ultimo aggiornamento: {LEGAL.lastUpdated}
      </p>
      {intro ? (
        <p className="mt-6 text-base leading-relaxed text-neutral-600">{intro}</p>
      ) : null}
      <article className="legal-prose mt-10 border-t border-neutral-200 pt-8">
        {children}
      </article>
    </div>
  );
}
