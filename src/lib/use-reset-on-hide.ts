"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Esegue `reset` quando la pagina viene nascosta dal router.
 *
 * Con Cache Components Next.js non smonta le pagine quando si naviga:
 * le nasconde con React Activity, preservando lo stato. Senza un reset,
 * al ritorno un pulsante resterebbe bloccato in "caricamento" (o una
 * tendina resterebbe aperta).
 *
 * Il cleanup di useLayoutEffect scatta proprio quando la pagina viene
 * nascosta: è il pattern indicato dalla guida Next.js "Preserving UI
 * state" per azzerare lo stato transitorio.
 */
export function useResetOnHide(reset: () => void) {
  const resetRef = useRef(reset);

  useEffect(() => {
    resetRef.current = reset;
  });

  useLayoutEffect(() => {
    return () => {
      resetRef.current();
    };
  }, []);
}
