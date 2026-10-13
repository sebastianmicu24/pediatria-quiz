import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { shuffle } from "@/lib/utils";
import type { Question } from "@/lib/types";

export type QuestionRow = {
  id: string;
  question: string;
  options: unknown;
  answer_index: number;
  topic: string | null;
  difficulty: number | null;
  explanation: string | null;
};

export const QUESTION_COLUMNS =
  "id, question, options, answer_index, topic, difficulty, explanation";

export function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    question: row.question,
    options: Array.isArray(row.options)
      ? row.options.map((option) => String(option))
      : [],
    answer_index: row.answer_index,
    topic: row.topic ?? "Generale",
    difficulty: row.difficulty ?? 2,
    explanation: row.explanation ?? "",
  };
}

/** Scarta le righe malformate (opzioni insufficienti o indice fuori range). */
export function isValidQuestion(question: Question): boolean {
  return (
    question.options.length >= 2 &&
    question.answer_index >= 0 &&
    question.answer_index < question.options.length
  );
}

type BatchFilters = {
  /** Argomenti selezionati: vuoto = tutti. */
  topics: string[];
  /** Difficoltà selezionate: vuoto = tutte. */
  difficulties: number[];
  count: number;
  /** Id delle domande già mostrate: non vengono riproposte. */
  exclude?: string[];
};

/**
 * Estrae un lotto di domande casuali rispettando i filtri.
 *
 * Percorso preferito: la RPC `get_quiz_questions` (random + filtri +
 * esclusione eseguiti in Postgres, scalabile su migliaia di domande).
 *
 * Fallback: se la funzione non è ancora stata applicata al database,
 * legge le domande a pagine e mescola lato server — applicando
 * SEMPRE gli stessi filtri, così argomenti e difficoltà funzionano
 * in entrambi i casi.
 */
export async function fetchQuestionBatch(
  supabase: SupabaseClient,
  { topics, difficulties, count, exclude = [] }: BatchFilters
): Promise<Question[]> {
  const { data, error } = await supabase.rpc("get_quiz_questions", {
    p_count: count,
    p_topics: topics,
    p_difficulties: difficulties,
    p_exclude: exclude,
  });

  if (!error && data) {
    return (data as QuestionRow[]).map(toQuestion).filter(isValidQuestion);
  }

  // Fallback (finché la migrazione non è applicata): filtri attivi.
  const { rows } = await fetchAllRows<QuestionRow>(() => {
    let query = supabase
      .from("questions")
      .select(QUESTION_COLUMNS)
      .order("id", { ascending: true });
    if (topics.length > 0) query = query.in("topic", topics);
    if (difficulties.length > 0) query = query.in("difficulty", difficulties);
    return query;
  });

  const seen = new Set(exclude);
  return shuffle(rows)
    .filter((row) => !seen.has(row.id))
    .slice(0, count)
    .map(toQuestion)
    .filter(isValidQuestion);
}
