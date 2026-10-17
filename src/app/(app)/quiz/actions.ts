"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isReviewStatus } from "@/lib/constants";
import { fetchQuestionBatch } from "@/lib/questions";
import { isMissingFunctionError } from "@/lib/supabase/schema-compat";
import type { AnswerSendResult } from "@/lib/quiz-answer-queue";
import type { Question } from "@/lib/types";

export type SaveAttemptInput = {
  topic: string | null;
  difficulty: number | null;
  answers: { questionId: string; selectedIndex: number }[];
};

export type SaveAttemptResult =
  | { ok: true; attemptId: string }
  | { ok: false; message: string };

/**
 * Salva un tentativo di quiz completato.
 * Il punteggio è ricalcolato dal database confrontando le risposte
 * con le domande originali: il client non può falsificarlo.
 */
export async function saveQuizAttempt(
  input: SaveAttemptInput
): Promise<SaveAttemptResult> {
  await requireUser("/quiz");

  const answers = input?.answers;
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > 2000) {
    return { ok: false, message: "Dati del tentativo non validi." };
  }

  const valid = answers.every(
    (a) =>
      a &&
      typeof a.questionId === "string" &&
      a.questionId.length > 0 &&
      Number.isInteger(a.selectedIndex) &&
      a.selectedIndex >= 0
  );
  if (!valid) {
    return { ok: false, message: "Dati del tentativo non validi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_quiz_attempt", {
    p_answers: answers.map((a) => ({
      question_id: a.questionId,
      selected_index: a.selectedIndex,
    })),
    p_topic: typeof input.topic === "string" && input.topic ? input.topic : null,
    p_difficulty:
      input.difficulty === 1 || input.difficulty === 2 || input.difficulty === 3
        ? input.difficulty
        : null,
  });

  if (error) {
    return {
      ok: false,
      message:
        "Non è stato possibile salvare i risultati. Potrai riprovare completando un nuovo quiz.",
    };
  }

  return { ok: true, attemptId: String(data) };
}

export type QuizBatchInput = {
  topics: string[];
  difficulties: number[];
  statuses: string[];
  exclude: string[];
  count: number;
};

export type QuizBatchResult =
  | { ok: true; questions: Question[] }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Prossimo lotto di domande per l'esercitazione progressiva.
 * Le domande già mostrate (exclude) non vengono riproposte.
 */
export async function fetchQuizBatch(
  input: QuizBatchInput
): Promise<QuizBatchResult> {
  await requireUser("/quiz");

  const topics = Array.isArray(input?.topics)
    ? [
        ...new Set(
          input.topics
            .filter(
              (topic): topic is string =>
                typeof topic === "string" && topic.trim() !== ""
            )
            .map((topic) => topic.trim().slice(0, 200))
        ),
      ].slice(0, 25)
    : [];
  const difficulties = Array.isArray(input?.difficulties)
    ? [...new Set(input.difficulties.map((d) => Number(d)))].filter(
        (d) => d === 1 || d === 2 || d === 3
      )
    : [];
  const statuses = Array.isArray(input?.statuses)
    ? [...new Set(input.statuses.filter((s) => isReviewStatus(s)))]
    : [];
  const count = Number.isInteger(input?.count)
    ? Math.min(Math.max(input.count, 1), 50)
    : 10;
  const exclude = Array.isArray(input?.exclude)
    ? input.exclude
        .filter((id): id is string => typeof id === "string" && UUID_RE.test(id))
        .slice(0, 5000)
    : [];

  const supabase = await createClient();
  const questions = await fetchQuestionBatch(supabase, {
    topics,
    difficulties,
    statuses,
    count,
    exclude,
  });

  return { ok: true, questions };
}

/**
 * Verifica leggera dell'identità per il percorso caldo (una risposta).
 *
 * `getClaims()` verifica la firma del token in locale (JWKS in cache di
 * processo) invece di chiamare Supabase Auth a ogni risposta: il
 * middleware ha già applicato il redirect per la sessione, e a decidere
 * chi vede cosa resta comunque `auth.uid()` dentro la RPC e le policy RLS.
 */
async function hasSession(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await supabase.auth.getClaims();
    return typeof data?.claims?.sub === "string";
  } catch {
    return false;
  }
}

export type RecordAnswerInput = {
  questionId: string;
  selectedIndex: number;
  /** Argomento dell'esercitazione, se i filtri ne indicano uno solo. */
  topic: string | null;
  /** Difficoltà dell'esercitazione, se i filtri ne indicano una sola. */
  difficulty: number | null;
};

/**
 * Registra subito una risposta dell'esercitazione in corso, così
 * un'interruzione di rete non fa perdere i progressi. Lato database è
 * un'unica RPC idempotente: rinviare la stessa risposta non cambia nulla.
 */
export async function recordQuizAnswer(
  input: RecordAnswerInput
): Promise<AnswerSendResult> {
  const questionId = typeof input?.questionId === "string" ? input.questionId : "";
  const selectedIndex = input?.selectedIndex;
  if (
    !UUID_RE.test(questionId) ||
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0
  ) {
    return "skipped";
  }

  const supabase = await createClient();
  if (!(await hasSession(supabase))) return "unavailable";

  const { data, error } = await supabase.rpc("record_quiz_answer", {
    p_question_id: questionId,
    p_selected_index: selectedIndex,
    p_topic:
      typeof input.topic === "string" && input.topic
        ? input.topic.slice(0, 200)
        : null,
    p_difficulty:
      input.difficulty === 1 || input.difficulty === 2 || input.difficulty === 3
        ? input.difficulty
        : null,
  });

  if (error) {
    // RPC non ancora applicata al database (migrazione in sospeso):
    // il client smette di provare e salva tutto con "Termina".
    if (isMissingFunctionError(error)) return "unavailable";
    return "retry";
  }

  // `false` = risposta scartata dal server (domanda non più esistente,
  // indice fuori range, limite di sessione): inutile ritentarla.
  return data === true ? "saved" : "skipped";
}

export type FinishSessionResult =
  | { ok: true; attemptId: string; total: number; correct: number }
  | { ok: false; reason: "unavailable" | "no_session" | "no_answers" | "error" };

/**
 * Chiude l'esercitazione in corso trasformandola in un tentativo.
 *
 * `answers` è la coda rimasta sul client (invii non riusciti): viene
 * registrata dal database prima di chiudere, quindi "Termina" salva
 * sempre tutto. Totali e correttezza sono ricalcolati in SQL.
 */
export async function finishQuizSession(
  answers: { questionId: string; selectedIndex: number }[]
): Promise<FinishSessionResult> {
  await requireUser("/quiz");

  const payload = Array.isArray(answers)
    ? answers
        .filter(
          (answer) =>
            answer &&
            UUID_RE.test(answer.questionId) &&
            Number.isInteger(answer.selectedIndex) &&
            answer.selectedIndex >= 0
        )
        .slice(0, 2000)
        .map((answer) => ({
          question_id: answer.questionId,
          selected_index: answer.selectedIndex,
        }))
    : [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_quiz_session", {
    p_answers: payload,
  });

  if (error) {
    return {
      ok: false,
      reason: isMissingFunctionError(error) ? "unavailable" : "error",
    };
  }

  const result = data as {
    ok?: boolean;
    reason?: string;
    attemptId?: string;
    total?: number;
    correct?: number;
  } | null;

  if (!result || result.ok !== true) {
    if (result?.reason === "no_session" || result?.reason === "no_answers") {
      return { ok: false, reason: result.reason };
    }
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    attemptId: String(result.attemptId),
    total: Number(result.total) || 0,
    correct: Number(result.correct) || 0,
  };
}

/**
 * Scarta l'esercitazione in corso ("Ricomincia da capo").
 * I progressi già registrati per domanda restano: le risposte sono state
 * date davvero.
 */
export async function discardQuizSession(): Promise<void> {
  const supabase = await createClient();
  if (!(await hasSession(supabase))) return;
  await supabase.rpc("discard_quiz_session");
}

