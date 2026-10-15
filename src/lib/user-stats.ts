import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/paginate";
import type {
  AttemptSummary,
  TopicCoverageDatum,
  TopicStat,
} from "@/lib/types";

type TopicAnswerRow = {
  is_correct: boolean;
  questions: { topic?: string } | { topic?: string }[] | null;
};

/**
 * Esiti per materia basati sui progressi: una riga per domanda con
 * l'ultima risposta data (le nuove risposte sovrascrivono le vecchie).
 * Se la tabella question_progress non è ancora presente (migrazione
 * non applicata), ricade sulle risposte storiche.
 */
async function fetchTopicProgress(supabase: SupabaseClient) {
  const progress = await fetchAllRows<TopicAnswerRow>(() =>
    supabase
      .from("question_progress")
      .select("is_correct, questions!inner(topic)")
      .order("question_id", { ascending: true })
  );
  if (!progress.error) return progress;

  return fetchAllRows<TopicAnswerRow>(() =>
    supabase
      .from("quiz_answers")
      .select("is_correct, questions!inner(topic)")
      .order("id", { ascending: true })
  );
}

export type UserStats = {
  hasError: boolean;
  /** Esercitazioni, dalla più recente. */
  attempts: AttemptSummary[];
  /** Argomenti disponibili, in ordine alfabetico. */
  topics: string[];
  coverage: TopicCoverageDatum[];
  topicStats: TopicStat[];
  totals: {
    attempts: number;
    answered: number;
    correct: number;
    /** Domande distinte svolte (ultima risposta per domanda). */
    uniqueDone: number;
    uniqueCorrect: number;
    available: number;
  };
  bestTopic: { topic: string; correct: number; total: number } | null;
};

/** Carica tutto ciò che serve per dashboard e pagina statistiche personali. */
export async function loadUserStats(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStats> {
  const [attemptsResult, topicProgressResult, topicsResult] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select(
        "id, topic, difficulty, total_questions, correct_answers, completed_at"
      )
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(500),
    fetchTopicProgress(supabase),
    fetchAllRows<{ topic: string | null }>(() =>
      supabase
        .from("questions")
        .select("topic")
        .order("id", { ascending: true })
    ),
  ]);

  const hasError = Boolean(
    attemptsResult.error || topicProgressResult.error || topicsResult.error
  );

  const attempts = (attemptsResult.data ?? []) as AttemptSummary[];

  const topicMap = new Map<string, { total: number; correct: number }>();
  for (const row of topicProgressResult.rows) {
    const nested = row.questions;
    const topic = Array.isArray(nested) ? nested[0]?.topic : nested?.topic;
    if (!topic) continue;
    const entry = topicMap.get(topic) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    topicMap.set(topic, entry);
  }
  const topicStats: TopicStat[] = [...topicMap.entries()]
    .map(([topic, s]) => ({ topic, total: s.total, correct: s.correct }))
    .sort((a, b) => b.total - a.total);

  const topicCounts = new Map<string, number>();
  for (const row of topicsResult.rows) {
    if (!row.topic) continue;
    topicCounts.set(row.topic, (topicCounts.get(row.topic) ?? 0) + 1);
  }
  const topics = [...topicCounts.keys()].sort((a, b) => a.localeCompare(b, "it"));

  const coverage: TopicCoverageDatum[] = topics
    .map((topic) => ({
      topic,
      done: topicMap.get(topic)?.total ?? 0,
      correct: topicMap.get(topic)?.correct ?? 0,
      available: topicCounts.get(topic) ?? 0,
    }))
    .sort((a, b) => {
      // Prima gli argomenti già affrontati (per numero di svolte), poi gli altri.
      if ((a.done > 0) !== (b.done > 0)) return a.done > 0 ? -1 : 1;
      if (a.done !== b.done) return b.done - a.done;
      return a.topic.localeCompare(b.topic, "it");
    });

  const best = [...topicStats]
    .filter((t) => t.total >= 3)
    .sort((a, b) => b.correct / b.total - a.correct / a.total)[0];

  return {
    hasError,
    attempts,
    topics,
    coverage,
    topicStats,
    totals: {
      attempts: attempts.length,
      answered: attempts.reduce((sum, a) => sum + a.total_questions, 0),
      correct: attempts.reduce((sum, a) => sum + a.correct_answers, 0),
      uniqueDone: coverage.reduce((sum, c) => sum + c.done, 0),
      uniqueCorrect: coverage.reduce((sum, c) => sum + c.correct, 0),
      available: coverage.reduce((sum, c) => sum + c.available, 0),
    },
    bestTopic: best ?? null,
  };
}
