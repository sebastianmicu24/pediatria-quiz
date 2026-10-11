import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { MAX_QUESTIONS } from "@/lib/constants";
import { parseDifficulty, parseQuestionCount, shuffle } from "@/lib/utils";
import type { Question } from "@/lib/types";
import { QuizClient } from "./quiz-client";
import { QuizEmpty } from "./quiz-empty";

type QuizSearchParams = Awaited<PageProps<"/quiz">["searchParams"]>;

type QuestionRow = {
  id: string;
  question: string;
  options: unknown;
  answer_index: number;
  topic: string | null;
  difficulty: number | null;
  explanation: string | null;
};

function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
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
  const count = parseQuestionCount(
    typeof raw.count === "string" ? raw.count : undefined,
    MAX_QUESTIONS
  );

  const supabase = await createClient();

  // Percorso veloce: estrazione casuale direttamente dal database (RPC).
  // Scala su migliaia di domande senza trasferire l'intero archivio.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_quiz_questions",
    {
      p_count: count,
      p_topic: topic,
      p_difficulty: difficulty,
    }
  );

  let rows: QuestionRow[];

  if (!rpcError && rpcData) {
    rows = rpcData as QuestionRow[];
  } else {
    // Fallback (finché la migrazione con la funzione RPC non è applicata
    // al database): legge tutte le domande a pagine e mescola lato server.
    const { rows: all } = await fetchAllRows<QuestionRow>(() =>
      supabase
        .from("questions")
        .select(
          "id, question, options, answer_index, topic, difficulty, explanation"
        )
        .order("id", { ascending: true })
    );
    rows = shuffle(all).slice(0, count);
  }

  if (rows.length === 0) {
    return (
      <QuizEmpty
        variant="empty"
        message="Nessuna domanda trovata con i filtri selezionati. Prova a cambiare argomento o difficoltà."
      />
    );
  }

  const questions: Question[] = rows
    .map(toQuestion)
    .filter((q) => q.options.length >= 2 && q.answer_index < q.options.length);

  if (questions.length === 0) {
    return (
      <QuizEmpty
        variant="empty"
        message="Nessuna domanda valida con i filtri selezionati. Prova a cambiare argomento o difficoltà."
      />
    );
  }

  // Chiave univoca: permette di "rigiocare" con nuove domande casuali
  // anche dopo un router.refresh() (rimonta il componente con stato pulito).
  const quizKey = crypto.randomUUID();

  return (
    <QuizClient
      key={quizKey}
      questions={questions}
      meta={{ topic, difficulty }}
    />
  );
}
