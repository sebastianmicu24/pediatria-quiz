/**
 * Parametri di ricerca (query string) delle pagine admin.
 * Con la paginazione lato server filtri e pagina vivono nell'URL,
 * così i link restano condivisibili e il tasto Indietro funziona.
 */
export type AdminSearchParams = Record<
  string,
  string | string[] | undefined
>;

/** Primo valore di un parametro (se ripetuto, l'API lo restituisce come array). */
export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Ripulisce il testo cercato prima di passarlo a un filtro PostgREST:
 * virgole, parentesi e graffe separano le condizioni di `or()`, `%` e `*`
 * sono i jolly di `ilike`, la barra rovesciata è un carattere di escape.
 * Accenti, apostrofi e spazi restano: servono per cercare davvero.
 */
export function sanitizeSearchTerm(value: string, maxLength = 80): string {
  return value
    .replace(/[,()"\\%*{}[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Numero di pagina richiesto, sempre almeno 1. */
export function parsePage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstParam(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
