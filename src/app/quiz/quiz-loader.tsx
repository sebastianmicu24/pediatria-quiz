import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseDifficulty } from "@/lib/utils";
import { EXERCISE_BATCH_SIZE } from "@/lib/constants";
import { fetchQuestionBatch } from "@/lib/questions";
import { QuizClient } from "./quiz-client";
import { QuizEmpty } from "./quiz-empty";

type QuizSearchParams = Awaited<PageProps<"/quiz">["searchParams"]>;

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
  const topic =
    typeof raw.topic === "string" && raw.topic.trim() !== ""
      ? raw.topic.trim()
      : null;
  const difficulty = parseDifficulty(
    typeof raw.difficulty === "string" ? raw.difficulty : undefined
  );

  const supabase = await createClient();
  const questions = await fetchQuestionBatch(supabase, {
    topic,
    difficulty,
    count: EXERCISE_BATCH_SIZE,
    exclude: [],
  });

  if (questions.length === 0) {
    return (
      <QuizEmpty
        variant="empty"
        message="Nessuna domanda trovata con i filtri selezionati. Prova a cambiare argomento o difficoltà."
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
      meta={{ topic, difficulty }}
    />
  );
}
