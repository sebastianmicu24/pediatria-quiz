import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";
import { formatNumber } from "@/lib/constants";
import {
  firstParam,
  parsePage,
  sanitizeSearchTerm,
  type AdminSearchParams,
} from "@/lib/supabase/search-params";
import { Alert } from "@/components/ui/alert";
import { AdminQuizManager, type AdminQuestion } from "./quiz-manager";

/** Domande per pagina: la paginazione avviene nel database. */
const PAGE_SIZE = 20;

const QUESTION_COLUMNS =
  "id, source_id, question, options, answer_index, topic, difficulty, explanation";

/**
 * Gestione delle domande. Filtri e paginazione sono lato server:
 * prima questa pagina scaricava tutte le domande con testo, opzioni e
 * spiegazioni (8,79 MB) e lasciava al browser ricerca e paginazione.
 */
export async function QuizContent({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const query = sanitizeSearchTerm(firstParam(params.q));
  const topic = firstParam(params.topic).trim().slice(0, 120);
  const page = parsePage(params.page);
  const from = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  // Argomenti per il filtro: una riga per argomento (19), non 12.449 righe.
  const topicsResult = await admin
    .from("question_topic_counts")
    .select("topic")
    .order("topic", { ascending: true });
  const topics = topicsResult.error
    ? []
    : (topicsResult.data ?? []).map((row) => String(row.topic));

  // Solo le domande della pagina richiesta. La vista admin_question_list
  // espone il testo senza tag HTML per la ricerca; se non è ancora stata
  // creata (migrazione non applicata) si usa la tabella.
  function fetchPage(useView: boolean) {
    const list = admin
      .from(useView ? "admin_question_list" : "questions")
      .select(QUESTION_COLUMNS, { count: "exact" });

    const scoped = topic ? list.eq("topic", topic) : list;
    if (!query) return scoped.order("topic").order("source_id").range(from, from + PAGE_SIZE - 1);

    const column = useView ? "question_plain" : "question";
    const term = `%${query}%`;
    return scoped
      .or(`${column}.ilike.${term},topic.ilike.${term},source_id.ilike.${term}`)
      .order("topic")
      .order("source_id")
      .range(from, from + PAGE_SIZE - 1);
  }

  let result = await fetchPage(true);
  if (result.error && isMissingColumnError(result.error.message)) {
    // Vista non ancora creata: si presta dalla tabella (ricerca sul testo HTML).
    result = await fetchPage(false);
  }

  if (result.error) {
    return (
      <Alert variant="error">
        Impossibile caricare le domande: verifica la configurazione e riprova.
      </Alert>
    );
  }

  const questions: AdminQuestion[] = (result.data ?? []).map((row) => ({
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

  const total = result.count ?? questions.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(query || topic);

  return (
    <>
      <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
        {formatNumber(total)} domande {filtered ? "trovate" : "nel database"}. Le
        modifiche a testi, opzioni e soluzioni sono immediate per tutti gli
        utenti.
      </p>

      <div className="mt-6">
        <AdminQuizManager
          questions={questions}
          topics={topics}
          total={total}
          page={page}
          pageCount={pageCount}
          query={query}
          topic={topic}
        />
      </div>
    </>
  );
}
