import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { formatPercent } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { StatCard } from "./stat-card";
import { QuizSetup } from "./quiz-setup";
import { RecentAttempts } from "./recent-attempts";
import { TopicStats } from "./topic-stats";
import type { AttemptSummary, TopicStat } from "@/lib/types";
import { BarChart3, BookOpenCheck, Target, Trophy } from "lucide-react";

export async function DashboardContent() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [profileResult, attemptsResult, answersResult, topicsResult] =
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
      supabase
        .from("quiz_answers")
        .select("is_correct, questions!inner(topic)")
        .limit(2000),
      supabase.from("questions").select("topic"),
    ]);

  const setupError = [profileResult.error, attemptsResult.error].find(Boolean);

  const displayName =
    profileResult.data?.display_name ??
    user.displayName ??
    user.email?.split("@")[0] ??
    "utente";

  const attempts: AttemptSummary[] = (attemptsResult.data ?? []) as AttemptSummary[];
  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct_answers, 0);

  // Statistiche per argomento
  const topicMap = new Map<string, { total: number; correct: number }>();
  for (const row of answersResult.data ?? []) {
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
      (topicsResult.data ?? [])
        .map((row) => row.topic)
        .filter((t): t is string => Boolean(t))
    ),
  ].sort((a, b) => a.localeCompare(b, "it"));

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
            ? "Benvenuto in Pediatroma! Inizia con il tuo primo quiz qui sotto."
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

      {!setupError && profileResult.data && !profileResult.data.status ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50/60 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-orange-900">
            <strong>Aiutaci a migliorare:</strong> aggiungi status, città e
            scuola al profilo — sono facoltativi e usati solo per statistiche
            aggregate.
          </p>
          <Link
            href="/account"
            className="text-sm font-medium text-orange-800 underline underline-offset-2"
          >
            Completa il profilo
          </Link>
        </div>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Quiz completati"
          value={String(totalAttempts)}
          hint={totalAttempts === 0 ? "Nessun quiz ancora" : "In totale"}
        />
        <StatCard
          icon={BookOpenCheck}
          label="Domande risposte"
          value={String(totalQuestions)}
          hint="Su tutti i quiz"
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
            Inizia un nuovo quiz
          </h2>
          <div className="mt-4">
            <QuizSetup topics={topics} />
          </div>

          <h2 className="mt-10 text-xl font-semibold tracking-tight text-slate-900">
            Ultimi quiz
          </h2>
          <div className="mt-4">
            <RecentAttempts attempts={attempts.slice(0, 5)} />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Prestazioni per argomento
          </h2>
          <div className="mt-4">
            <TopicStats stats={topicStats.slice(0, 8)} />
          </div>
        </div>
      </section>
    </>
  );
}
