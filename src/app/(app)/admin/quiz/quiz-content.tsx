import { requireAdmin } from "@/lib/admin";
import { getTopicCatalog } from "@/lib/catalog";
import { measured } from "@/lib/perf";
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

/** Id di una domanda (UUID): `?edit=<id>` apre direttamente l'editor. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type QuestionRow = {
  id: string;
  source_id: string | null;
  question: string;
  options: unknown;
  answer_index: number;
  topic: string | null;
  difficulty: number | null;
  explanation: string | null;
};

/** Riga del database → domanda dell'editor (valori mancanti normalizzati). */
function toAdminQuestion(row: QuestionRow): AdminQuestion {
  return {
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
  };
}

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
  // Impostato dal tasto "Quiz successivo/precedente" quando si attraversa
  // il confine di una pagina: apre direttamente l'editor sulla prima o
  // sull'ultima domanda della nuova pagina. Con un id di domanda
  // (`?edit=<uuid>`) l'editor si apre su quella domanda: è il collegamento
  // "Modifica" che compare nel quiz agli amministratori.
  const editParam = firstParam(params.edit);
  const autoEdit =
    editParam === "first" || editParam === "last" ? editParam : null;
  const focusId = !autoEdit && UUID_RE.test(editParam) ? editParam : null;
  const from = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  // Argomenti per il filtro: dal catalogo in cache (19 righe, non
  // 12.449) e con ricaduta su un elenco vuoto se la vista non è ancora
  // stata creata dal database (docs/PERFORMANCE.md § 5.B).
  const topics = (await getTopicCatalog()).map((entry) => entry.topic);

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

  // Una sola misura per la lettura della pagina, ricaduta compresa.
  const loadPage = async () => {
    const first = await fetchPage(true);
    if (!first.error || !isMissingColumnError(first.error.message)) return first;
    // Vista non ancora creata: si presta dalla tabella (ricerca sul testo HTML).
    return fetchPage(false);
  };

  // Domanda aperta direttamente dal quiz: una lettura per chiave primaria,
  // solo quando l'URL la richiede.
  const loadFocus = async (id: string) => {
    const { data } = await admin
      .from("questions")
      .select(QUESTION_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    return data ? toAdminQuestion(data) : null;
  };

  const [result, focus] = await Promise.all([
    measured("admin_question_list", loadPage, (page) => ({
      rows: page.data?.length ?? 0,
      total: page.count ?? undefined,
      code: page.error?.code,
    })),
    focusId ? loadFocus(focusId) : Promise.resolve(null),
  ]);

  if (result.error) {
    return (
      <Alert variant="error">
        Impossibile caricare le domande: verifica la configurazione e riprova.
      </Alert>
    );
  }

  const questions: AdminQuestion[] = (result.data ?? []).map(toAdminQuestion);

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
          key={`${page}|${topic}|${query}|${focusId ?? ""}`}
          autoEdit={autoEdit}
          focus={focus}
          questions={questions}
          topics={topics}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          pageCount={pageCount}
          query={query}
          topic={topic}
        />
      </div>
    </>
  );
}
