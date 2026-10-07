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
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-sm font-semibold text-brand-700">Informazioni legali</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        Ultimo aggiornamento: {LEGAL.lastUpdated}
      </p>
      {intro ? (
        <p className="mt-6 text-base leading-relaxed text-slate-600">{intro}</p>
      ) : null}
      <article className="legal-prose mt-8">{children}</article>
    </div>
  );
}
