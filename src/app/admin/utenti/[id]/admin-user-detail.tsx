import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Target,
  Trophy,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";
import {
  VERIFIED_TAG,
  difficultyLabel,
  isVerifiedTag,
  statusLabel,
  yearLabel,
} from "@/lib/constants";
import { formatDate, formatPercent } from "@/lib/utils";
import { TopicPies, type TopicPieDatum } from "@/components/topic-pies";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { UserTagEditor, VerifiedToggle } from "../user-tag-editor";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileRow = {
  display_name: string | null;
  status: string | null;
  year?: string | null;
  school: string | null;
  city: string | null;
  tags?: string[] | null;
};

type AttemptRow = {
  id: string;
  topic: string | null;
  difficulty: number | null;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
};

type TopicAnswerRow = {
  is_correct: boolean;
  questions: { topic?: string } | { topic?: string }[] | null;
};

export async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const admin = createAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(id);
  const authUser = authData?.user;
  if (authError || !authUser) notFound();

  // Profilo (fallback se le colonne anno/tag non sono ancora presenti).
  let profile: ProfileRow | null = null;
  {
    const withMeta = await admin
      .from("profiles")
      .select("display_name, status, year, school, city, tags")
      .eq("id", id)
      .maybeSingle();
    if (!withMeta.error) {
      profile = withMeta.data as ProfileRow | null;
    } else if (isMissingColumnError(withMeta.error.message)) {
      const legacy = await admin
        .from("profiles")
        .select("display_name, status, school, city")
        .eq("id", id)
        .maybeSingle();
      profile = legacy.data ? { ...legacy.data, year: null, tags: [] } : null;
    }
  }

  const tags = Array.isArray(profile?.tags) ? profile.tags : [];
  const verified = tags.some(isVerifiedTag);

  // Esercitazioni svolte (più recenti prima).
  const { rows: attempts } = await fetchAllRows<AttemptRow>(() =>
    admin
      .from("quiz_attempts")
      .select(
        "id, topic, difficulty, total_questions, correct_answers, completed_at"
      )
      .eq("user_id", id)
      .order("completed_at", { ascending: false })
      .order("id", { ascending: true })
  );

  // Andamento per materia: ultima risposta per domanda (question_progress)
  // oppure risposte storiche se la migrazione non è ancora applicata.
  let topicRows: TopicAnswerRow[] = [];
  {
    const progress = await fetchAllRows<TopicAnswerRow>(() =>
      admin
        .from("question_progress")
        .select("is_correct, questions!inner(topic)")
        .eq("user_id", id)
        .order("question_id", { ascending: true })
    );
    if (!progress.error) {
      topicRows = progress.rows;
    } else {
      const answers = await fetchAllRows<TopicAnswerRow>(() =>
        admin
          .from("quiz_answers")
          .select(
            "is_correct, questions!inner(topic), quiz_attempts!inner(user_id)"
          )
          .eq("quiz_attempts.user_id", id)
          .order("id", { ascending: true })
      );
      topicRows = answers.rows;
    }
  }

  // Copertura per materia: svolte vs totale disponibile.
  const { rows: questionRows } = await fetchAllRows<{ topic: string | null }>(
    () =>
      admin.from("questions").select("topic").order("id", { ascending: true })
  );

  const topicMap = new Map<string, { total: number; correct: number }>();
  for (const row of topicRows) {
    const nested = row.questions;
    const topic = Array.isArray(nested) ? nested[0]?.topic : nested?.topic;
    if (!topic) continue;
    const entry = topicMap.get(topic) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    topicMap.set(topic, entry);
  }

  const topicCounts = new Map<string, number>();
  for (const row of questionRows) {
    if (!row.topic) continue;
    topicCounts.set(row.topic, (topicCounts.get(row.topic) ?? 0) + 1);
  }

  const pieData: TopicPieDatum[] = [...topicCounts.keys()]
    .map((topic) => ({
      topic,
      done: topicMap.get(topic)?.total ?? 0,
      correct: topicMap.get(topic)?.correct ?? 0,
      available: topicCounts.get(topic) ?? 0,
    }))
    .sort((a, b) => {
      if ((a.done > 0) !== (b.done > 0)) return a.done > 0 ? -1 : 1;
      if (a.done !== b.done) return b.done - a.done;
      return a.topic.localeCompare(b.topic, "it");
    });

  const doneTotal = [...topicMap.values()].reduce(
    (sum, entry) => sum + entry.total,
    0
  );
  const correctTotal = [...topicMap.values()].reduce(
    (sum, entry) => sum + entry.correct,
    0
  );
  const totalAvailable = [...topicCounts.values()].reduce(
    (sum, count) => sum + count,
    0
  );

  const displayName =
    profile?.display_name ?? authUser.email?.split("@")[0] ?? "Utente";

  return (
    <>
      <Link
        href="/admin/utenti"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Tutti gli utenti
      </Link>

      <div className="mt-4">
        <AdminTabs active="utenti" />
      </div>

      {/* Scheda utente */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {displayName}
              </h1>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Verificato
                </span>
              ) : null}
              {!authUser.email_confirmed_at ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Email non confermata
                </span>
              ) : null}
            </div>

            <p className="mt-1 truncate text-sm text-slate-500">
              {authUser.email ?? "—"}
            </p>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>Iscritto {formatDate(authUser.created_at)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {authUser.last_sign_in_at
                  ? `Ultimo accesso ${formatDate(authUser.last_sign_in_at)}`
                  : "Mai entrato"}
              </span>
              <span aria-hidden="true">·</span>
              <span>{attempts.length} esercitazioni</span>
            </p>

            {profile?.status ||
            profile?.year ||
            profile?.city ||
            profile?.school ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                {profile.status ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {statusLabel(profile.status)}
                  </span>
                ) : null}
                {profile.year ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {yearLabel(profile.year)}
                  </span>
                ) : null}
                {profile.city ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {profile.city}
                  </span>
                ) : null}
                {profile.school ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {profile.school}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <VerifiedToggle userId={id} verified={verified} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-500">Tag</p>
          <div className="mt-2">
            <UserTagEditor userId={id} tags={tags} allTags={tags} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Il tag «{VERIFIED_TAG}» indica un utente verificato (in futuro
            abiliterà permessi particolari).
          </p>
        </div>
      </section>

      {/* Andamento */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium">Domande svolte</p>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {doneTotal}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            su {totalAvailable} disponibili
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Target className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium">Precisione</p>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatPercent(correctTotal, doneTotal)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {correctTotal} corrette su {doneTotal}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium">Esercitazioni</p>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {attempts.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">sessioni registrate</p>
        </div>
      </section>

      {/* Copertura per materia */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Copertura per materia
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Corrette, sbagliate e ancora da svolgere sul totale disponibile.
        </p>
        <div className="mt-4">
          <TopicPies data={pieData} />
        </div>
      </section>

      {/* Ultime esercitazioni */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Ultime esercitazioni
        </h2>
        {attempts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              Nessuna esercitazione ancora svolta.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {attempts.slice(0, 12).map((attempt) => {
                const percent =
                  attempt.total_questions > 0
                    ? attempt.correct_answers / attempt.total_questions
                    : 0;
                return (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {attempt.topic ?? "Tutti gli argomenti"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(attempt.completed_at)} · Difficoltà{" "}
                        {difficultyLabel(attempt.difficulty)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {attempt.correct_answers}/{attempt.total_questions}
                      </span>
                      <span
                        className={
                          percent >= 0.7
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                            : percent >= 0.5
                              ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                              : "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                        }
                      >
                        {formatPercent(
                          attempt.correct_answers,
                          attempt.total_questions
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {attempts.length > 12 ? (
              <p className="mt-2 text-xs text-slate-400">
                Mostrate le ultime 12 di {attempts.length}.
              </p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
