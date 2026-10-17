import type { SupabaseClient } from "@supabase/supabase-js";
import { measured } from "@/lib/perf";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { isMissingFunctionError } from "@/lib/supabase/schema-compat";
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
  const { data, error } = await measured(
    "get_quiz_questions",
    () =>
      supabase.rpc("get_quiz_questions", {
        p_count: count,
        p_topics: topics,
        p_difficulties: difficulties,
        p_exclude: exclude,
        p_status: statuses,
      }),
    (result) => ({
      rows: Array.isArray(result.data) ? result.data.length : 0,
      code: result.error?.code,
    })
  );

  if (!error) {
    // Nessuna riga (o nessuna domanda con questi filtri): archivio esaurito.
    return ((data as QuestionRow[] | null) ?? [])
      .map(toQuestion)
      .filter(isValidQuestion);
  }

  // Fallback (finché la migrazione non è applicata al database).
  //
  // Il percorso storico legge un conteggio esatto più fino a 3 finestre
  // da 800 righe complete: si attiva solo se la RPC non esiste (firma
  // diversa o migrazione non applicata). Su un errore transitorio la
  // ricaduta moltiplicherebbe il carico invece di ridurlo, quindi è
  // meglio restituire un lotto vuoto (l'esercitazione termina).
  if (!isMissingFunctionError(error)) return [];

  // Per non scaricare l'intero archivio (migliaia di domande) a ogni
  // richiesta si legge una finestra casuale di righe filtrate.
  const seen = new Set(exclude);

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

  const matchesPool = (row: QuestionRow): boolean => {
    if (seen.has(row.id)) return false;
    if (!statusFilter) return true;
    const answeredCorrectly = statusFilter.get(row.id);
    if (answeredCorrectly === undefined) return statuses.includes("new");
    return answeredCorrectly
      ? statuses.includes("correct")
      : statuses.includes("wrong");
  };

  // Numero totale di domande che rispettano argomento/difficoltà.
  let countQuery = supabase
    .from("questions")
    .select("*", { count: "exact", head: true });
  if (topics.length > 0) countQuery = countQuery.in("topic", topics);
  if (difficulties.length > 0) countQuery = countQuery.in("difficulty", difficulties);
  const { count: poolCount, error: countError } = await countQuery;
  if (countError || !poolCount) return [];

  const windowSize = Math.min(poolCount, 800);
  for (let attempt = 0; attempt < 3; attempt++) {
    const maxOffset = Math.max(0, poolCount - windowSize);
    const offset = Math.floor(Math.random() * (maxOffset + 1));

    let windowQuery = supabase
      .from("questions")
      .select(QUESTION_COLUMNS)
      .order("id", { ascending: true })
      .range(offset, offset + windowSize - 1);
    if (topics.length > 0) windowQuery = windowQuery.in("topic", topics);
    if (difficulties.length > 0) {
      windowQuery = windowQuery.in("difficulty", difficulties);
    }

    const { data, error } = await windowQuery;
    if (error) return [];

    const usable = ((data as QuestionRow[]) ?? []).filter(matchesPool);
    if (usable.length > 0) {
      return shuffle(usable)
        .slice(0, count)
        .map(toQuestion)
        .filter(isValidQuestion);
    }
    // Finestra interamente esclusa (ripasso/esclusione): nuovo tentativo.
  }
  return [];
}

/**
 * Legge un insieme di domande per id (una sola query indicizzata).
 *
 * Serve a ricostruire un'esercitazione ripresa dopo un'interruzione:
 * la sessione salvata contiene gli id delle domande già risposte e il
 * riepilogo ne ha bisogno per mostrare opzioni e spiegazioni.
 */
export async function fetchQuestionsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Question[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("questions")
    .select(QUESTION_COLUMNS)
    .in("id", ids);

  if (error) return [];
  return ((data as QuestionRow[] | null) ?? [])
    .map(toQuestion)
    .filter(isValidQuestion);
}
