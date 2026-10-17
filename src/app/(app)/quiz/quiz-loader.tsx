import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { parseDifficulties } from "@/lib/utils";
import { EXERCISE_BATCH_SIZE, isReviewStatus } from "@/lib/constants";
import { fetchQuestionBatch, fetchQuestionsByIds } from "@/lib/questions";
import { buildRecoveredSession, loadOpenQuizSession } from "@/lib/quiz-session";
import { getTopicCatalog } from "@/lib/catalog";
import { QuizClient } from "./quiz-client";
import { QuizEmpty } from "./quiz-empty";
import { QuizEmptyFilters } from "./quiz-empty-filters";

type QuizSearchParams = Awaited<PageProps<"/quiz">["searchParams"]>;

/** Normalizza un parametro ripetuto (?topic=A&topic=B) in una lista. */
function toStringList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.map((item) => item.trim()).filter(Boolean))];
}

/**
 * Carica il primo lotto di domande dell'esercitazione.
 * I lotti successivi vengono richiesti dal client mentre si avanza
 * (l'esercitazione è progressiva: una domanda alla volta, fino a
 * quando l'utente decide di terminare).
 *
 * Se c'è un'esercitazione interrotta (risposte salvate una per una) viene
 * ripresa: le domande già risposte tornano solo per il riepilogo, e si
 * riparte con domande nuove.
 */
export async function QuizLoader({
  searchParams,
}: {
  searchParams: Promise<QuizSearchParams>;
}) {
  const user = await requireUser("/quiz");

  const raw = await searchParams;
  const topics = toStringList(raw.topic).slice(0, 25);
  const difficulties = parseDifficulties(raw.difficulty);
  const statuses = toStringList(raw.status).filter(isReviewStatus);

  const supabase = await createClient();

  // Sessione in corso (se c'è): le sue domande non vanno riproposte.
  const openSession = await loadOpenQuizSession(supabase, user.id);
  const answeredIds = openSession?.answers.map((answer) => answer.questionId) ?? [];

  const [questions, catalog, answeredQuestions] = await Promise.all([
    fetchQuestionBatch(supabase, {
      topics,
      difficulties,
      statuses,
      count: EXERCISE_BATCH_SIZE,
      exclude: answeredIds,
    }),
    getTopicCatalog(),
    fetchQuestionsByIds(supabase, answeredIds),
  ]);

  const recovered = openSession
    ? buildRecoveredSession(openSession, answeredQuestions)
    : null;

  // Le domande già risposte precedono quelle nuove: il client riparte
  // dalla prima domanda ancora da fare e il riepilogo resta in ordine.
  const initialQuestions = recovered
    ? [...recovered.questions, ...questions]
    : questions;

  if (initialQuestions.length === 0) {
    return (
      <QuizEmpty
        variant="empty"
        message="Nessuna domanda trovata con i filtri selezionati. Prova a cambiare argomenti, difficoltà o ripasso."
      >
        <QuizEmptyFilters
          topics={catalog.map((entry) => entry.topic)}
          value={{ topics, difficulties, statuses }}
        />
      </QuizEmpty>
    );
  }

  // Chiave univoca: permette di iniziare una nuova esercitazione con
  // domande diverse anche dopo un router.refresh() (rimonta il
  // componente con stato pulito).
  const quizKey = crypto.randomUUID();

  return (
    <QuizClient
      key={quizKey}
      initialQuestions={initialQuestions}
      recovered={recovered}
      meta={{ topics, difficulties, statuses }}
      availableTopics={catalog.map((entry) => entry.topic)}
      // Solo per gli amministratori: nella pagina compare il collegamento
      // all'editor della domanda mostrata. Per gli altri utenti la pagina
      // è identica a prima.
      isAdmin={isAdminEmail(user.email)}
    />
  );
}
