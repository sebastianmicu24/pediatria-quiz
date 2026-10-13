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
