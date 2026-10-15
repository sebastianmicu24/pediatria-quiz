import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { formatNumber } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { AdminQuizManager, type AdminQuestion } from "./quiz-manager";

export async function QuizContent() {
  await requireAdmin();

  const admin = createAdminClient();
  const { rows, error } = await fetchAllRows<AdminQuestion>(() =>
    admin
      .from("questions")
      .select(
        "id, source_id, question, options, answer_index, topic, difficulty, explanation"
      )
      .order("topic", { ascending: true })
      .order("source_id", { ascending: true })
  );

  if (error) {
    return (
      <Alert variant="error">
        Impossibile caricare le domande: verifica la configurazione e riprova.
      </Alert>
    );
  }

  const questions: AdminQuestion[] = rows.map((row) => ({
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
      <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
        {formatNumber(questions.length)} domande nel database. Le modifiche a
        testi, opzioni e soluzioni sono immediate per tutti gli utenti.
      </p>

      <div className="mt-6">
        <AdminQuizManager questions={questions} topics={topics} />
      </div>
    </>
  );
}
