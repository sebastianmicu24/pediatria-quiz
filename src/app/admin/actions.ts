"use server";

import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeHtml, stripHtml } from "@/lib/utils";

export type QuestionFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const MAX_QUESTION_CHARS = 2000;
const MAX_EXPLANATION_CHARS = 10000;
const MAX_OPTION_CHARS = 300;
const MAX_TOPIC_CHARS = 80;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Aggiorna una domanda esistente. Solo per amministratori.
 * I campi HTML vengono sanitizzati con allowlist sia qui sia al render.
 */
export async function updateQuestion(
  _prevState: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) {
    return { status: "error", message: "Non autorizzato." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_REGEX.test(id)) {
    return { status: "error", message: "Identificativo della domanda non valido." };
  }

  const questionHtml = sanitizeHtml(String(formData.get("question") ?? "").trim());
  const questionText = stripHtml(questionHtml);
  if (questionText.length < 5) {
    return { status: "error", message: "Il testo della domanda è troppo corto." };
  }
  if (questionText.length > MAX_QUESTION_CHARS) {
    return { status: "error", message: `La domanda supera i ${MAX_QUESTION_CHARS} caratteri.` };
  }

  const explanationHtml = sanitizeHtml(
    String(formData.get("explanation") ?? "").trim()
  );
  if (stripHtml(explanationHtml).length > MAX_EXPLANATION_CHARS) {
    return { status: "error", message: `La spiegazione supera i ${MAX_EXPLANATION_CHARS} caratteri.` };
  }

  const options = formData.getAll("options").map((value) => String(value).trim());
  if (options.length < 2 || options.length > 6) {
    return { status: "error", message: "Le opzioni devono essere tra 2 e 6." };
  }
  if (options.some((option) => option.length === 0)) {
    return { status: "error", message: "Compila tutte le opzioni di risposta." };
  }
  if (options.some((option) => option.length > MAX_OPTION_CHARS)) {
    return { status: "error", message: `Ogni opzione può avere al massimo ${MAX_OPTION_CHARS} caratteri.` };
  }

  const answerIndex = Number.parseInt(String(formData.get("answer_index") ?? ""), 10);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
    return { status: "error", message: "Seleziona una risposta corretta valida." };
  }

  const topic = String(formData.get("topic") ?? "").trim().slice(0, MAX_TOPIC_CHARS);
  if (!topic) {
    return { status: "error", message: "Indica l'argomento della domanda." };
  }

  const difficulty = Number.parseInt(String(formData.get("difficulty") ?? ""), 10);
  if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) {
    return { status: "error", message: "Seleziona una difficoltà valida." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("questions")
    .update({
      question: questionHtml,
      options,
      answer_index: answerIndex,
      topic,
      difficulty,
      explanation: explanationHtml,
    })
    .eq("id", id);

  if (error) {
    return { status: "error", message: "Salvataggio non riuscito. Riprova." };
  }

  return { status: "success", message: "Domanda aggiornata correttamente." };
}

/** Elimina una domanda (e le risposte storiche collegate, per cascade). */
export async function deleteQuestion(
  id: string
): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) {
    return { ok: false, message: "Non autorizzato." };
  }
  if (!UUID_REGEX.test(id)) {
    return { ok: false, message: "Identificativo non valido." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("questions").delete().eq("id", id);
  if (error) {
    return { ok: false, message: "Eliminazione non riuscita. Riprova." };
  }
  return { ok: true, message: "Domanda eliminata." };
}
