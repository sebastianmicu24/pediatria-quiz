import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
        Errore 404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Pagina non trovata
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        La pagina che cerchi non esiste o è stata spostata. Controlla
        l&apos;indirizzo oppure torna alla dashboard per continuare ad
        allenarti.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Torna alla home</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">
          Vai alla dashboard
        </ButtonLink>
      </div>
      <Link
        href="/registrati"
        className="mt-6 text-sm font-medium text-brand-700 underline"
      >
        Non hai ancora un account? Registrati gratis
      </Link>
    </div>
  );
}
