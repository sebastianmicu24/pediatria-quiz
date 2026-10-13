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
  /** Stato di ripasso ('new' | 'correct' | 'wrong'): vuoto = tutte. */
  statuses: string[];
  count: number;
  /** Id delle domande già mostrate: non vengono riproposte. */
  exclude?: string[];
};

/**
 * Estrae un lotto di domande casuali rispettando i filtri.
 *
 * Percorso preferito: la RPC `get_quiz_questions` (random + filtri +
 * esclusione + stato di ripasso eseguiti in Postgres, scalabile su
 * migliaia di domande).
 *
 * Fallback: se la funzione non è ancora stata applicata al database,
 * legge le domande a pagine e mescola lato server — applicando
 * SEMPRE gli stessi filtri. Il filtro di ripasso richiede la tabella
 * question_progress: se manca, viene ignorato.
 */
export async function fetchQuestionBatch(
  supabase: SupabaseClient,
  { topics, difficulties, statuses, count, exclude = [] }: BatchFilters
): Promise<Question[]> {
  const { data, error } = await supabase.rpc("get_quiz_questions", {
    p_count: count,
    p_topics: topics,
    p_difficulties: difficulties,
    p_exclude: exclude,
    p_status: statuses,
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

  // Stato di ripasso: dall'ultima risposta salvata in question_progress.
  let statusFilter: Map<string, boolean> | null = null;
  if (statuses.length > 0) {
    const { rows: progressRows, error: progressError } =
      await fetchAllRows<{ question_id: string; is_correct: boolean }>(() =>
        supabase
          .from("question_progress")
          .select("question_id, is_correct")
          .order("question_id", { ascending: true })
      );
    if (!progressError) {
      statusFilter = new Map(
        progressRows.map((row) => [row.question_id, row.is_correct])
      );
    }
    // Se la tabella non esiste ancora (migrazione non applicata),
    // il filtro viene ignorato: meglio mostrare più domande che nessuna.
  }

  const seen = new Set(exclude);
  return shuffle(rows)
    .filter((row) => {
      if (seen.has(row.id)) return false;
      if (!statusFilter) return true;
      const answeredCorrectly = statusFilter.get(row.id);
      if (answeredCorrectly === undefined) return statuses.includes("new");
      return answeredCorrectly
        ? statuses.includes("correct")
        : statuses.includes("wrong");
    })
    .slice(0, count)
    .map(toQuestion)
    .filter(isValidQuestion);
}
