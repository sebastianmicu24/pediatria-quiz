import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseDifficulties } from "@/lib/utils";
import { EXERCISE_BATCH_SIZE, isReviewStatus } from "@/lib/constants";
import { fetchQuestionBatch } from "@/lib/questions";
import { QuizClient } from "./quiz-client";
import { QuizEmpty } from "./quiz-empty";

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
 */
export async function QuizLoader({
  searchParams,
}: {
  searchParams: Promise<QuizSearchParams>;
}) {
  await requireUser("/quiz");

  const raw = await searchParams;
  const topics = toStringList(raw.topic).slice(0, 25);
  const difficulties = parseDifficulties(raw.difficulty);
  const statuses = toStringList(raw.status).filter(isReviewStatus);

  const supabase = await createClient();
  const questions = await fetchQuestionBatch(supabase, {
    topics,
    difficulties,
    statuses,
    count: EXERCISE_BATCH_SIZE,
    exclude: [],
  });

  if (questions.length === 0) {
    return (
      <QuizEmpty
        variant="empty"
        message="Nessuna domanda trovata con i filtri selezionati. Prova a cambiare argomenti, difficoltà o ripasso."
      />
    );
  }

  // Chiave univoca: permette di iniziare una nuova esercitazione con
  // domande diverse anche dopo un router.refresh() (rimonta il
  // componente con stato pulito).
  const quizKey = crypto.randomUUID();

  return (
    <QuizClient
      key={quizKey}
      initialQuestions={questions}
      meta={{ topics, difficulties, statuses }}
    />
  );
}
