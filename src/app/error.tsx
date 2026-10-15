"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StatusPage } from "@/components/status-page";
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
    console.error("[pediatro.me] Errore di rendering:", error);
  }, [error]);

  return (
    <StatusPage
      code="Errore"
      title="Si è verificato un problema"
      actions={
        <>
          <Button onClick={retry}>Riprova</Button>
          <Button variant="secondary" onClick={() => router.push("/")}>
            Torna alla home
          </Button>
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
