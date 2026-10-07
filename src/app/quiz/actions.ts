"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > 500) {
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
