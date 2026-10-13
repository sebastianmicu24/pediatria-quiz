"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchQuestionBatch } from "@/lib/questions";
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
    count,
    exclude,
  });

  return { ok: true, questions };
}
