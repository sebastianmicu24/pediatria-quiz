import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Alert } from "@/components/ui/alert";
import { AdminQuizManager, type AdminQuestion } from "./admin-quiz-manager";

export async function AdminContent() {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) notFound();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select(
      "id, source_id, question, options, answer_index, topic, difficulty, explanation"
    )
    .order("topic", { ascending: true })
    .order("source_id", { ascending: true })
    .limit(2000);

  if (error) {
    return (
      <Alert variant="error">
        Impossibile caricare le domande: verifica la configurazione e riprova.
      </Alert>
    );
  }

  const questions: AdminQuestion[] = (data ?? []).map((row) => ({
    id: row.id,
    source_id: row.source_id ?? "",
    question: row.question,
    options: Array.isArray(row.options)
      ? row.options.map((option) => String(option))
      : [],
    answer_index: row.answer_index,
    topic: row.topic ?? "Generale",
    difficulty: row.difficulty ?? 2,
    explanation: row.explanation ?? "",
  }));

  const topics = [...new Set(questions.map((question) => question.topic))].sort(
    (a, b) => a.localeCompare(b, "it")
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Gestione quiz
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            {questions.length} domande nel database. Modifica testi (con editor
            formattato), opzioni e soluzioni — oppure elimina le domande.
            Le modifiche sono immediate per tutti gli utenti.
          </p>
        </div>
        <Link
          href="/statistiche"
          className="text-sm font-medium text-brand-700 underline underline-offset-2"
        >
          Vai alle statistiche
        </Link>
      </header>

      <div className="mt-6">
        <AdminQuizManager questions={questions} topics={topics} />
      </div>
    </>
  );
}
