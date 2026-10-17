import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question, QuizAnswerInput, RecoveredQuizSession } from "@/lib/types";

/**
 * Oltre questa inattività la sessione salvata non viene ripresa: le
 * risposte date restano nelle statistiche per argomento, ma
 * l'esercitazione riparte da zero.
 */
export const QUIZ_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type OpenQuizSession = {
  topic: string | null;
  difficulty: number | null;
  answers: QuizAnswerInput[];
};

type SessionRow = {
  topic: string | null;
  difficulty: number | null;
  updated_at: string;
  quiz_session_answers:
    | { question_id: string; selected_index: number }[]
    | null;
};

/**
 * Legge l'esercitazione in corso dell'utente, se ce n'è una recente.
 *
 * Una sessione più vecchia del TTL viene eliminata qui (una riga, evento
 * raro: succede solo quando l'utente torna su /quiz dopo un giorno di
 * inattività) e non viene ripresa.
 *
 * Se le tabelle non sono ancora state create (migrazione non applicata)
 * restituisce null: l'esercitazione parte da zero, come prima.
 */
export async function loadOpenQuizSession(
  supabase: SupabaseClient,
  userId: string
): Promise<OpenQuizSession | null> {
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select(
      "topic, difficulty, updated_at, quiz_session_answers(question_id, selected_index, answered_at)"
    )
    .eq("user_id", userId)
    .order("answered_at", {
      referencedTable: "quiz_session_answers",
      ascending: true,
    })
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as SessionRow;

  if (Date.now() - new Date(row.updated_at).getTime() > QUIZ_SESSION_TTL_MS) {
    await supabase.from("quiz_sessions").delete().eq("user_id", userId);
    return null;
  }

  const answers = (row.quiz_session_answers ?? [])
    .filter(
      (answer) =>
        typeof answer?.question_id === "string" &&
        Number.isInteger(answer.selected_index) &&
        answer.selected_index >= 0
    )
    .map((answer) => ({
      questionId: answer.question_id,
      selectedIndex: answer.selected_index,
    }));

  if (answers.length === 0) return null;

  return {
    topic: row.topic,
    difficulty: row.difficulty,
    answers,
  };
}

/**
 * Ricompone l'esercitazione ripresa: risposte in ordine cronologico e
 * domande corrispondenti. Le risposte di domande non più esistenti
 * restano nelle statistiche ma non entrano nel riepilogo (non avrebbero
 * opzioni né spiegazione da mostrare).
 */
export function buildRecoveredSession(
  session: OpenQuizSession,
  questions: Question[]
): RecoveredQuizSession | null {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const recoveredQuestions: Question[] = [];
  const answers: RecoveredQuizSession["answers"] = [];

  for (const answer of session.answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue;
    recoveredQuestions.push(question);
    answers.push({
      questionId: question.id,
      selectedIndex: answer.selectedIndex,
      isCorrect: answer.selectedIndex === question.answer_index,
    });
  }

  if (answers.length === 0) return null;

  return {
    answers,
    questions: recoveredQuestions,
    topic: session.topic,
    difficulty: session.difficulty,
  };
}
