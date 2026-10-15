export const SITE_NAME = "pediatro.me";
export const SITE_TAGLINE = "Quiz per un domani più grande";
export const SITE_DESCRIPTION =
  "pediatro.me: quiz di pediatria con spiegazioni, statistiche personali e ripasso per argomento, per studenti, specializzandi e pediatri. Da Roma, gratuito.";

/** Statistiche del dataset (aggiornate da scripts/generate-data.mjs). */
export const QUIZ_STATS = {
  questions: 12449,
  topics: 19,
};

/** Numero con separatore delle migliaia all'italiana (12449 → 12.449). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("it-IT").format(value);
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Base",
  2: "Intermedia",
  3: "Avanzata",
};

export function difficultyLabel(difficulty: number | null | undefined): string {
  if (difficulty == null) return "—";
  return DIFFICULTY_LABELS[difficulty] ?? `Livello ${difficulty}`;
}

/**
 * Dimensione dei lotti di domande caricati progressivamente durante
 * un'esercitazione (primo lotto + richiami successivi). Un lotto più
 * grande dimezza i round trip del precaricamento: il costo di ogni
 * richiesta è dominato dal viaggio, non dai 15 KB di domande
 * (docs/PERFORMANCE.md § 5.G).
 */
export const EXERCISE_BATCH_SIZE = 20;

/**
 * Status dell'utente (dato facoltativo del profilo).
 * Usato per le statistiche aggregate: mai mostrato pubblicamente.
 */
export const STATUS_OPTIONS = [
  { value: "studente", label: "Studente di medicina" },
  { value: "specializzando", label: "Specializzando/a" },
  { value: "professionista", label: "Professionista sanitario" },
  { value: "altro", label: "Altro" },
] as const;

export type ProfileStatus = (typeof STATUS_OPTIONS)[number]["value"];

export function isProfileStatus(value: string | null | undefined): value is ProfileStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

export function statusLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * Anno di studi (dato facoltativo del profilo).
 * Usato per le statistiche aggregate: mai mostrato pubblicamente.
 */
export const YEAR_OPTIONS = [
  { value: "1", label: "1° anno" },
  { value: "2", label: "2° anno" },
  { value: "3", label: "3° anno" },
  { value: "4", label: "4° anno" },
  { value: "5", label: "5° anno" },
  { value: "6", label: "6° anno" },
  { value: "specializzazione", label: "Scuola di specializzazione" },
  { value: "altro", label: "Altro" },
] as const;

export type ProfileYear = (typeof YEAR_OPTIONS)[number]["value"];

export function isProfileYear(value: string | null | undefined): value is ProfileYear {
  return YEAR_OPTIONS.some((option) => option.value === value);
}

export function yearLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return YEAR_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/**
 * Filtro di ripasso basato sull'ultima risposta data a ogni domanda.
 * Nessuna selezione = tutte le domande.
 */
export const REVIEW_OPTIONS = [
  { value: "new", label: "Mai risposte (nuove)" },
  { value: "correct", label: "Risposte correttamente" },
  { value: "wrong", label: "Risposte in modo errato" },
] as const;

export type ReviewStatus = (typeof REVIEW_OPTIONS)[number]["value"];

export function isReviewStatus(value: string | null | undefined): value is ReviewStatus {
  return REVIEW_OPTIONS.some((option) => option.value === value);
}

/**
 * Tag convenzionale per gli utenti verificati manualmente dagli admin.
 * In futuro abilità permessi particolari: usare sempre questa costante
 * per controlli e assegnazione (il confronto è senza distinzione di
 * maiuscole).
 */
export const VERIFIED_TAG = "verificato";

export function isVerifiedTag(tag: string | null | undefined): boolean {
  return (tag ?? "").trim().toLowerCase() === VERIFIED_TAG;
}
