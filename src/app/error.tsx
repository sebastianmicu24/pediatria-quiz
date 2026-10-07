"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Pediatroma] Errore di rendering:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Si è verificato un errore imprevisto
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
        Riprova tra qualche istante. Se il problema persiste, contattaci
        indicando il codice errore.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-slate-400">Codice errore: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={retry}>Riprova</Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Torna alla home
        </Button>
      </div>
    </div>
  );
}
