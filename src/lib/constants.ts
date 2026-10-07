export const SITE_NAME = "Pediatroma";
export const SITE_TAGLINE = "La palestra dei futuri pediatri";
export const SITE_DESCRIPTION =
  "Pediatroma è la palestra dei futuri pediatri: quiz di pediatria con spiegazioni, statistiche personali e contenuti per studenti, specializzandi e professionisti. Registrati gratis.";

/** Statistiche del dataset (aggiornate da scripts/generate-data.mjs). */
export const QUIZ_STATS = {
  questions: 297,
  topics: 18,
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Base",
  2: "Intermedia",
  3: "Avanzata",
};

export function difficultyLabel(difficulty: number | null | undefined): string {
  if (difficulty == null) return "—";
  return DIFFICULTY_LABELS[difficulty] ?? `Livello ${difficulty}`;
}

export const COUNT_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_QUESTION_COUNT = 20;
export const MAX_QUESTIONS = 50;

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
