import type { SupabaseClient } from "@supabase/supabase-js";
import { measured } from "@/lib/perf";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { isMissingFunctionError } from "@/lib/supabase/schema-compat";
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
 * Tentativi caricati per la dashboard e per la cronologia delle statistiche.
 * I totali (numero di esercitazioni, risposte, corrette) non dipendono da
 * questo limite: nel percorso normale li calcola il database.
 */
const ATTEMPT_LIMIT = 500;

/** Materie confrontate per "migliore/peggiore": almeno 3 domande svolte. */
const MIN_ANSWERS_FOR_COMPARISON = 3;

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
  /** Materia con la percentuale di risposte corrette più alta. */
  bestTopic: TopicStat | null;
  /** Materia con la percentuale più bassa (null se non c'è confronto). */
  worstTopic: TopicStat | null;
};

// ─────────────────────────────────────────────────────────────
//  Calcoli condivisi dai due percorsi (RPC e lettura diretta)
// ─────────────────────────────────────────────────────────────

/** Aggrega righe "materia + esito" in statistiche per materia. */
function topicStatsFromRows(rows: TopicAnswerRow[]): TopicStat[] {
  const byTopic = new Map<string, { total: number; correct: number }>();
  for (const row of rows) {
    const nested = row.questions;
    const topic = Array.isArray(nested) ? nested[0]?.topic : nested?.topic;
    if (!topic) continue;
    const entry = byTopic.get(topic) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    byTopic.set(topic, entry);
  }
  return [...byTopic.entries()]
    .map(([topic, s]) => ({ topic, total: s.total, correct: s.correct }))
    .sort((a, b) => b.total - a.total);
}

/** Copertura: prima gli argomenti già affrontati, poi per numero di svolte. */
function sortCoverage(a: TopicCoverageDatum, b: TopicCoverageDatum) {
  if ((a.done > 0) !== (b.done > 0)) return a.done > 0 ? -1 : 1;
  if (a.done !== b.done) return b.done - a.done;
  return a.topic.localeCompare(b.topic, "it");
}

function coverageFrom(
  topics: string[],
  topicStats: TopicStat[],
  availableByTopic: Map<string, number>
): TopicCoverageDatum[] {
  const doneByTopic = new Map(topicStats.map((stat) => [stat.topic, stat]));
  return topics
    .map((topic) => ({
      topic,
      done: doneByTopic.get(topic)?.total ?? 0,
      correct: doneByTopic.get(topic)?.correct ?? 0,
      available: availableByTopic.get(topic) ?? 0,
    }))
    .sort(sortCoverage);
}

/**
 * Materie in cui si va meglio e peggio. Il confronto usa le materie con
 * almeno 3 domande svolte, ma solo se ce ne sono almeno due; altrimenti
 * ripiega su tutte quelle affrontate, così il confronto esiste sempre
 * (e resta assente solo quando non c'è nulla da confrontare).
 */
function pickBestWorst(topicStats: TopicStat[]): {
  best: TopicStat | null;
  worst: TopicStat | null;
} {
  const byAccuracy = [...topicStats].sort(
    (a, b) => b.correct / b.total - a.correct / a.total || b.total - a.total
  );
  const solid = byAccuracy.filter(
    (stat) => stat.total >= MIN_ANSWERS_FOR_COMPARISON
  );
  const ranked = solid.length >= 2 ? solid : byAccuracy;
  return {
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
  };
}

// ─────────────────────────────────────────────────────────────
//  Percorso normale: una sola RPC, aggregazione in SQL
// ─────────────────────────────────────────────────────────────

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asTopicStats(value: unknown): TopicStat[] {
  if (!Array.isArray(value)) return [];
  const stats: TopicStat[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.topic !== "string" || !row.topic) continue;
    stats.push({
      topic: row.topic,
      total: asNumber(row.total),
      correct: asNumber(row.correct),
    });
  }
  return stats.sort((a, b) => b.total - a.total);
}

function asCoverage(value: unknown): TopicCoverageDatum[] {
  if (!Array.isArray(value)) return [];
  const rows: TopicCoverageDatum[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.topic !== "string" || !row.topic) continue;
    rows.push({
      topic: row.topic,
      done: asNumber(row.done),
      correct: asNumber(row.correct),
      available: asNumber(row.available),
    });
  }
  return rows.sort(sortCoverage);
}

/**
 * Esito della lettura via RPC. "missing" = funzione non (ancora)
 * applicata al database (o firma diversa); "error" = errore inatteso
 * (timeout, 5xx, permessi).
 */
type RpcOutcome =
  | { kind: "ok"; stats: UserStats }
  | { kind: "missing" }
  | { kind: "error" };

/**
 * Carica le statistiche con get_user_stats(): il database aggrega le
 * 12.449 domande in 19 righe invece di trasferire l'intera tabella.
 */
async function loadStatsFromRpc(
  supabase: SupabaseClient
): Promise<RpcOutcome> {
  const { data, error } = await measured(
    "get_user_stats",
    () => supabase.rpc("get_user_stats", { p_attempt_limit: ATTEMPT_LIMIT }),
    (result) => {
      const attempts = (result.data as { attempts?: unknown[] } | null)
        ?.attempts;
      return {
        attempts: Array.isArray(attempts) ? attempts.length : 0,
        code: result.error?.code,
      };
    }
  );

  if (error) {
    return isMissingFunctionError(error)
      ? { kind: "missing" }
      : { kind: "error" };
  }
  if (!data) return { kind: "error" };

  const payload = data as {
    totals?: Record<string, unknown> | null;
    topics?: unknown;
    coverage?: unknown;
    topicStats?: unknown;
    attempts?: unknown;
  };

  const topicStats = asTopicStats(payload.topicStats);
  const topics = Array.isArray(payload.topics)
    ? payload.topics
        .filter((topic): topic is string => typeof topic === "string")
        .sort((a, b) => a.localeCompare(b, "it"))
    : [];
  const coverage = asCoverage(payload.coverage);
  const totals = payload.totals ?? {};
  const { best, worst } = pickBestWorst(topicStats);

  return {
    kind: "ok",
    stats: {
      hasError: false,
      attempts: (payload.attempts ?? []) as AttemptSummary[],
      topics,
      coverage,
      topicStats,
      totals: {
        attempts: asNumber(totals.attempts),
        answered: asNumber(totals.answered),
        correct: asNumber(totals.correct),
        uniqueDone: asNumber(totals.uniqueDone),
        uniqueCorrect: asNumber(totals.uniqueCorrect),
        available: asNumber(totals.available),
      },
      bestTopic: best,
      worstTopic: worst,
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  Percorso storico: lettura diretta delle tabelle
//  (solo se la RPC non è disponibile: migrazione non applicata)
// ─────────────────────────────────────────────────────────────

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

async function loadStatsFromTables(
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
      .limit(ATTEMPT_LIMIT),
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
  const topicStats = topicStatsFromRows(topicProgressResult.rows);

  const topicCounts = new Map<string, number>();
  for (const row of topicsResult.rows) {
    if (!row.topic) continue;
    topicCounts.set(row.topic, (topicCounts.get(row.topic) ?? 0) + 1);
  }
  const topics = [...topicCounts.keys()].sort((a, b) => a.localeCompare(b, "it"));
  const coverage = coverageFrom(topics, topicStats, topicCounts);
  const { best, worst } = pickBestWorst(topicStats);

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
    bestTopic: best,
    worstTopic: worst,
  };
}

/** Stato di errore: la pagina avvisa invece di mostrare zeri verosimili. */
function emptyUserStats(): UserStats {
  return {
    hasError: true,
    attempts: [],
    topics: [],
    coverage: [],
    topicStats: [],
    totals: {
      attempts: 0,
      answered: 0,
      correct: 0,
      uniqueDone: 0,
      uniqueCorrect: 0,
      available: 0,
    },
    bestTopic: null,
    worstTopic: null,
  };
}

/** Carica tutto ciò che serve per dashboard e pagina statistiche personali. */
export async function loadUserStats(
  supabase: SupabaseClient,
  userId: string
): Promise<UserStats> {
  const outcome = await loadStatsFromRpc(supabase);
  if (outcome.kind === "ok") return outcome.stats;

  // Funzione non presente nel database: ricaduta sul percorso storico.
  if (outcome.kind === "missing") return loadStatsFromTables(supabase, userId);

  // Errore inatteso (timeout, 5xx, permessi): niente ricaduta pesante,
  // che sotto carico peggiorerebbe la situazione invece di migliorarla.
  // La misura è nei log dell'app (docs/PERFORMANCE.md § 5.I).
  return emptyUserStats();
}
