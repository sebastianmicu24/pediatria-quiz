export const SITE_NAME = "Quiz Pediatria";
export const SITE_DESCRIPTION =
  "Allenati con quiz di pediatria: centinaia di domande con spiegazioni, organizzate per argomento e difficoltà. Registrati gratis.";

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
