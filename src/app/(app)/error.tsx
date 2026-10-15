"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/status-page";
import { Button, ButtonLink } from "@/components/ui/button";

export default function AppErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[pediatro.me] Errore di rendering:", error);
  }, [error]);

  return (
    <StatusPage
      code="Errore"
      title="Si è verificato un problema"
      className="mx-0"
      actions={
        <>
          <Button onClick={retry}>Riprova</Button>
          <ButtonLink href="/dashboard" variant="secondary">
            Torna alla dashboard
          </ButtonLink>
        </>
      }
    >
      <p>
        Riprova tra qualche istante. Se il problema persiste, contattaci
        indicando il codice errore.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-neutral-400">
          Codice errore: {error.digest}
        </p>
      ) : null}
    </StatusPage>
  );
}
