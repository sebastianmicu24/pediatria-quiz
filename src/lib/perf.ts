/**
 * Misure di durata per le letture più pesanti (docs/PERFORMANCE.md § 5.I).
 *
 * In sviluppo ogni misura stampa una riga leggibile; in produzione il
 * log è strutturato (JSON) e resta spento finché non si imposta
 * `PERF_LOG=1`: così il rumore nei log di Vercel è una scelta.
 *
 * L'etichetta è il nome della lettura ("get_user_stats",
 * "get_admin_overview", …): sono poche righe per page view e bastano
 * per capire *quale* query domina il tempo di risposta.
 */

/** In sviluppo le misure servono, in produzione no (a meno di PERF_LOG). */
const DEV = process.env.NODE_ENV !== "production";
const ENABLED = DEV || process.env.PERF_LOG === "1";

type PerfValue = string | number | boolean | null;

export type PerfDetails = Record<string, PerfValue | undefined>;

/** Registra una misura già calcolata. */
export function logPerf(label: string, ms: number, details: PerfDetails = {}) {
  if (!ENABLED) return;
  const rounded = Math.round(ms);

  if (DEV) {
    const extra = Object.entries(details)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");
    console.info(`[perf] ${label} ${rounded}ms${extra ? ` ${extra}` : ""}`);
    return;
  }

  console.info(JSON.stringify({ type: "perf", label, ms: rounded, ...details }));
}

/**
 * Esegue `run` misurandone la durata. `describe` ricava dal risultato i
 * dettagli utili (numero di righe, codice di errore). Quando le misure
 * sono spente la funzione è un semplice passaggio diretto: nessun
 * cronometro e nessuna proprietà calcolata a vuoto.
 */
export async function measured<T>(
  label: string,
  run: () => PromiseLike<T>,
  describe?: (result: T) => PerfDetails
): Promise<T> {
  if (!ENABLED) return run();

  const started = performance.now();
  const result = await run();
  logPerf(label, performance.now() - started, describe?.(result));
  return result;
}
