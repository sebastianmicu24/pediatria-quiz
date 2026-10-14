import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { requireUser } from "@/lib/auth";
import { formatPercent } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "./stat-card";
import { QuizSetup } from "./quiz-setup";
import { RecentAttempts } from "./recent-attempts";
import { TopicPies, type TopicPieDatum } from "@/components/topic-pies";
import type { AttemptSummary, TopicStat } from "@/lib/types";
import { BarChart3, BookOpenCheck, Target } from "lucide-react";

type TopicAnswerRow = {
  is_correct: boolean;
  questions: { topic?: string } | { topic?: string }[] | null;
};

/**
 * Esiti per materia basati sui progressi: una riga per domanda con
 * l'ultima risposta data (le nuove risposte sovrascrivono le vecchie).
 * Se la tabella question_progress non è ancora presente (migrazione
 * non applicata), ricade sulle risposte storiche.
 */
async function fetchTopicProgress(
  supabase: SupabaseClient
): Promise<{ rows: TopicAnswerRow[]; error: string | null }> {
  const progress = await fetchAllRows<TopicAnswerRow>(() =>
    supabase
      .from("question_progress")
      .select("is_correct, questions!inner(topic)")
      .order("question_id", { ascending: true })
  );
  if (!progress.error) return progress;

  return fetchAllRows<TopicAnswerRow>(() =>
    supabase
      .from("quiz_answers")
      .select("is_correct, questions!inner(topic)")
      .order("id", { ascending: true })
  );
}

export async function DashboardContent() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [profileResult, attemptsResult, topicProgressResult, topicsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, status")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("quiz_attempts")
        .select(
          "id, topic, difficulty, total_questions, correct_answers, completed_at"
        )
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(500),
      fetchTopicProgress(supabase),
      fetchAllRows<{ topic: string | null }>(() =>
        supabase
          .from("questions")
          .select("topic")
          .order("id", { ascending: true })
      ),
    ]);

  const setupError = [
    profileResult.error,
    attemptsResult.error,
    topicProgressResult.error,
    topicsResult.error,
  ].find(Boolean);

  const displayName =
    profileResult.data?.display_name ??
    user.displayName ??
    user.email?.split("@")[0] ??
    "utente";

  const attempts: AttemptSummary[] = (attemptsResult.data ?? []) as AttemptSummary[];
  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct_answers, 0);

  // Statistiche per argomento (ultima risposta per domanda)
  const topicMap = new Map<string, { total: number; correct: number }>();
  for (const row of topicProgressResult.rows) {
    const nested = row.questions as { topic?: string } | { topic?: string }[] | null;
    const topic = Array.isArray(nested)
      ? nested[0]?.topic
      : nested?.topic ?? "Generale";
    if (!topic) continue;
    const entry = topicMap.get(topic) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    topicMap.set(topic, entry);
  }
  const topicStats: TopicStat[] = [...topicMap.entries()]
    .map(([topic, s]) => ({ topic, total: s.total, correct: s.correct }))
    .sort((a, b) => b.total - a.total);

  // Elenco argomenti per il configuratore
  const topics = [
    ...new Set(
      topicsResult.rows
        .map((row) => row.topic)
        .filter((t): t is string => Boolean(t))
    ),
  ].sort((a, b) => a.localeCompare(b, "it"));

  // Copertura per materia: svolte vs totale disponibile (tutte le domande
  // del database per quella materia, comprese quelle mai affrontate).
  const topicCounts = new Map<string, number>();
  for (const row of topicsResult.rows) {
    if (!row.topic) continue;
    topicCounts.set(row.topic, (topicCounts.get(row.topic) ?? 0) + 1);
  }

  const pieData: TopicPieDatum[] = topics
    .map((topic) => ({
      topic,
      done: topicMap.get(topic)?.total ?? 0,
      correct: topicMap.get(topic)?.correct ?? 0,
      available: topicCounts.get(topic) ?? 0,
    }))
    .sort((a, b) => {
      // Prima le materie già affrontate (per numero di svolte), poi le altre.
      if ((a.done > 0) !== (b.done > 0)) return a.done > 0 ? -1 : 1;
      if (a.done !== b.done) return b.done - a.done;
      return a.topic.localeCompare(b.topic, "it");
    });

  const bestTopic = [...topicStats]
    .filter((t) => t.total >= 3)
    .sort((a, b) => b.correct / b.total - a.correct / a.total)[0];

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Ciao, {displayName}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {totalAttempts === 0
            ? "Benvenuto in Pediatroma! Inizia con la tua prima esercitazione qui sotto."
            : "Ecco il riepilogo dei tuoi progressi. Continua così!"}
        </p>
      </header>

      {setupError ? (
        <Alert variant="error" className="mt-6">
          <strong>Database non inizializzato.</strong> Sembra che lo schema non
          sia stato ancora applicato al progetto Supabase: esegui{" "}
          <code className="rounded bg-white/60 px-1">supabase/schema.sql</code>{" "}
          nell&apos;SQL Editor e ricarica la pagina.
        </Alert>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          icon={BookOpenCheck}
          label="Domande risposte"
          value={String(totalQuestions)}
          hint="Su tutte le esercitazioni"
        />
        <StatCard
          icon={Target}
          label="Precisione complessiva"
          value={formatPercent(totalCorrect, totalQuestions)}
          hint={`${totalCorrect} risposte corrette`}
        />
        <StatCard
          icon={BarChart3}
          label="Argomenti affrontati"
          value={String(topicStats.length)}
          hint={
            bestTopic
              ? `Migliore: ${bestTopic.topic} (${formatPercent(bestTopic.correct, bestTopic.total)})`
              : "In attesa di dati"
          }
        />
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Inizia un&apos;esercitazione
          </h2>
          <div className="mt-4">
            <QuizSetup topics={topics} />
          </div>

          <h2 className="mt-10 text-xl font-semibold tracking-tight text-slate-900">
            Ultime esercitazioni
          </h2>
          <div className="mt-4">
            <RecentAttempts attempts={attempts.slice(0, 5)} />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Percentuali per materia
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Copertura sul totale disponibile: corrette, sbagliate e ancora da
            svolgere. Ogni nuova risposta sovrascrive la precedente.
          </p>
          <div className="mt-4">
            <TopicPies data={pieData} />
          </div>
        </div>
      </section>
    </>
  );
}
