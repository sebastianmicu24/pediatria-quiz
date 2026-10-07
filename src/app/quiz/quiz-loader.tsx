import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_QUESTIONS } from "@/lib/constants";
import { parseDifficulty, parseQuestionCount, shuffle } from "@/lib/utils";
import type { Question } from "@/lib/types";
import { QuizClient } from "./quiz-client";
import { QuizEmpty } from "./quiz-empty";

type QuizSearchParams = Awaited<PageProps<"/quiz">["searchParams"]>;

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

  let query = supabase
    .from("questions")
    .select("id, question, options, answer_index, topic, difficulty, explanation")
    .limit(2000);
  if (topic) query = query.eq("topic", topic);
  if (difficulty !== null) query = query.eq("difficulty", difficulty);

  const { data, error } = await query;

  if (error) {
    return (
      <QuizEmpty
        variant="error"
        message="Non è stato possibile caricare le domande. Verifica che lo schema del database sia stato applicato (supabase/schema.sql) e che le domande siano state importate."
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <QuizEmpty
        variant="empty"
        message="Nessuna domanda trovata con i filtri selezionati. Prova a cambiare argomento o difficoltà."
      />
    );
  }

  const questions: Question[] = shuffle(data)
    .slice(0, count)
    .map((row) => ({
      id: row.id,
      question: row.question,
      options: Array.isArray(row.options)
        ? row.options.map((option) => String(option))
        : [],
      answer_index: row.answer_index,
      topic: row.topic ?? "Generale",
      difficulty: row.difficulty ?? 2,
      explanation: row.explanation ?? "",
    }))
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
