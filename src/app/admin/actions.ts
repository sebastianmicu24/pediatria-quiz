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

// ─────────────────────────────────────────────────────────────
//  Immagini delle domande (bucket Supabase Storage "quiz-images")
// ─────────────────────────────────────────────────────────────

const IMAGE_BUCKET = "quiz-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

let imageBucketEnsured = false;

/** Crea il bucket se non esiste (idempotente, serve solo la prima volta). */
async function ensureImageBucket(
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  if (imageBucketEnsured) return;
  const { error } = await admin.storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  // Se esiste già va bene: l'upload funziona comunque.
  if (error && !/already exists|duplicate/i.test(error.message)) {
    return;
  }
  imageBucketEnsured = true;
}

export type UploadImageResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Carica un'immagine nel bucket pubblico "quiz-images" e restituisce
 * l'URL da inserire nel testo. Solo amministratori; PNG/JPG/WebP fino
 * a 5 MB (niente SVG o data URL, che verrebbero comunque rimossi dal
 * sanitizzatore).
 */
export async function uploadQuizImage(
  formData: FormData
): Promise<UploadImageResult> {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) {
    return { ok: false, message: "Non autorizzato." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Nessun file ricevuto." };
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  if (!extension) {
    return { ok: false, message: "Formato non supportato: usa PNG, JPG o WebP." };
  }
  if (file.size === 0) {
    return { ok: false, message: "Il file è vuoto." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "L'immagine supera il limite di 5 MB." };
  }

  const admin = createAdminClient();
  await ensureImageBucket(admin);

  const path = `questions/${crypto.randomUUID()}.${extension}`;
  const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) {
    return { ok: false, message: "Caricamento non riuscito. Riprova." };
  }

  const { data } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, message: "Impossibile ottenere l'URL dell'immagine." };
  }

  return { ok: true, url: data.publicUrl };
}
