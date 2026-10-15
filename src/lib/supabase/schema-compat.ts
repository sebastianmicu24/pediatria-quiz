/**
 * Rileva gli errori dovuti a colonne non ancora presenti nel database
 * (migrazione non applicata). Permette ai percorsi critici di degradare
 * con grazia — es. mostrare il profilo senza anno/tag — invece di
 * rompersi finché la migrazione non viene eseguita.
 */
export function isMissingColumnError(
  error: { code?: string; message?: string } | string | null | undefined
): boolean {
  if (!error) return false;
  if (typeof error === "string") {
    return /does not exist|schema cache/i.test(error);
  }
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /does not exist|schema cache/i.test(error.message ?? "");
}

/**
 * Codici di una funzione RPC non disponibile: PostgREST non trova la
 * funzione con quella firma (PGRST202/PGRST203), Postgres non la
 * conosce (42883) oppure la funzione richiama una tabella che sul
 * database non esiste ancora (42P01, es. migrazione applicata solo in
 * parte).
 */
const MISSING_FUNCTION_CODES = new Set([
  "PGRST202",
  "PGRST203",
  "42883",
  "42P01",
]);

/**
 * Rileva gli errori che indicano una migrazione non (del tutto)
 * applicata al database. È la *sola* condizione in cui conviene
 * ricadere sul percorso storico, molto più pesante: sugli errori
 * transitori (timeout, 5xx) la ricaduta moltiplicherebbe il carico
 * invece di ridurlo (docs/PERFORMANCE.md § 5.G).
 */
export function isMissingFunctionError(
  error: { code?: string; message?: string } | string | null | undefined
): boolean {
  if (!error) return false;
  if (typeof error === "string") {
    return /could not find the function|could not choose the best candidate|function .* does not exist|schema cache/i.test(
      error
    );
  }
  if (error.code && MISSING_FUNCTION_CODES.has(error.code)) return true;
  return /could not find the function|could not choose the best candidate|function .* does not exist/i.test(
    error.message ?? ""
  );
}
