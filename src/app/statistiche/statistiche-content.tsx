import { notFound } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  GraduationCap,
  MapPin,
  Target,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatPercent } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";

type ProfileRow = {
  id: string;
  status: string | null;
  school: string | null;
  city: string | null;
  created_at: string;
};

type AttemptRow = {
  id: string;
  user_id: string;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
};

type AnswerRow = {
  is_correct: boolean;
  questions: { topic?: string } | { topic?: string }[] | null;
};

type Bucket = { users: Set<string>; questions: number; correct: number };

function emptyBucket(): Bucket {
  return { users: new Set(), questions: 0, correct: 0 };
}

function addAttempt(bucket: Bucket, attempt: AttemptRow) {
  bucket.questions += attempt.total_questions;
  bucket.correct += attempt.correct_answers;
}

/**
 * Legge tutte le righe a pagine (PostgREST limita a 1000 righe per richiesta).
 */
async function fetchAllRows<T>(
  makeQuery: () => {
    range: (
      from: number,
      to: number
    ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
  },
  maxRows = 50_000
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error || !data) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return rows;
}

const DAY = 86_400_000;

export async function StatisticheContent() {
  const user = await requireUser("/statistiche");
  if (!isAdminEmail(user.email)) notFound();

  const admin = createAdminClient();

  const [profiles, attempts, answers] = await Promise.all([
    fetchAllRows<ProfileRow>(() =>
      admin
        .from("profiles")
        .select("id, status, school, city, created_at")
        .order("created_at", { ascending: true })
    ),
    fetchAllRows<AttemptRow>(() =>
      admin
        .from("quiz_attempts")
        .select("id, user_id, total_questions, correct_answers, completed_at")
        .order("completed_at", { ascending: true })
    ),
    fetchAllRows<AnswerRow>(() =>
      admin
        .from("quiz_answers")
        .select("is_correct, questions!inner(topic)")
        .order("id", { ascending: true })
    ),
  ]);

  // Il pannello è renderizzato a request time (dopo la lettura dei cookie
  // in requireUser): leggere l'orologio qui è sicuro.
  // eslint-disable-next-line react-hooks/purity -- request-time, non prerender
  const now = Date.now();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  // ── KPI ─────────────────────────────────────────────────────
  const totalUsers = profiles.length;
  const newUsers30 = profiles.filter(
    (profile) => now - Date.parse(profile.created_at) <= 30 * DAY
  ).length;
  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct_answers, 0);
  const activeUsers30 = new Set(
    attempts
      .filter((a) => now - Date.parse(a.completed_at) <= 30 * DAY)
      .map((a) => a.user_id)
  ).size;

  // ── Aggregazioni ────────────────────────────────────────────
  const statusBuckets = new Map<string, Bucket>();
  for (const profile of profiles) {
    const key = statusLabel(profile.status) ?? "Non indicato";
    const bucket = statusBuckets.get(key) ?? emptyBucket();
    bucket.users.add(profile.id);
    statusBuckets.set(key, bucket);
  }

  const cityBuckets = new Map<string, Bucket>();
  const schoolBuckets = new Map<string, Bucket>();
  for (const profile of profiles) {
    if (profile.city?.trim()) {
      const key = profile.city.trim();
      const bucket = cityBuckets.get(key) ?? emptyBucket();
      bucket.users.add(profile.id);
      cityBuckets.set(key, bucket);
    }
    if (profile.school?.trim()) {
      const key = profile.school.trim();
      const bucket = schoolBuckets.get(key) ?? emptyBucket();
      bucket.users.add(profile.id);
      schoolBuckets.set(key, bucket);
    }
  }

  for (const attempt of attempts) {
    const profile = profileById.get(attempt.user_id);

    const statusKey = statusLabel(profile?.status ?? null) ?? "Non indicato";
    const statusBucket = statusBuckets.get(statusKey) ?? emptyBucket();
    addAttempt(statusBucket, attempt);
    statusBuckets.set(statusKey, statusBucket);

    const city = profile?.city?.trim();
    if (city) {
      const bucket = cityBuckets.get(city) ?? emptyBucket();
      addAttempt(bucket, attempt);
      cityBuckets.set(city, bucket);
    }
    const school = profile?.school?.trim();
    if (school) {
      const bucket = schoolBuckets.get(school) ?? emptyBucket();
      addAttempt(bucket, attempt);
      schoolBuckets.set(school, bucket);
    }
  }

  const sortByUsers = (a: [string, Bucket], b: [string, Bucket]) =>
    b[1].users.size - a[1].users.size;
  const statusRows = [...statusBuckets.entries()].sort(sortByUsers);
  const cityRows = [...cityBuckets.entries()].sort(sortByUsers).slice(0, 8);
  const schoolRows = [...schoolBuckets.entries()].sort(sortByUsers).slice(0, 8);

  // ── Attività ultimi 14 giorni ───────────────────────────────
  const activityDays: { label: string; count: number }[] = [];
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const start = dayStart.getTime() - i * DAY;
    const end = start + DAY;
    const count = attempts.filter((a) => {
      const time = Date.parse(a.completed_at);
      return time >= start && time < end;
    }).length;
    activityDays.push({
      label: new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(start)),
      count,
    });
  }
  const activityMax = Math.max(...activityDays.map((day) => day.count), 1);

  // ── Distribuzione punteggi ──────────────────────────────────
  const scoreBuckets = [
    { label: "≥ 85%", count: 0 },
    { label: "70–84%", count: 0 },
    { label: "50–69%", count: 0 },
    { label: "< 50%", count: 0 },
  ];
  for (const attempt of attempts) {
    if (attempt.total_questions <= 0) continue;
    const percent = attempt.correct_answers / attempt.total_questions;
    if (percent >= 0.85) scoreBuckets[0].count += 1;
    else if (percent >= 0.7) scoreBuckets[1].count += 1;
    else if (percent >= 0.5) scoreBuckets[2].count += 1;
    else scoreBuckets[3].count += 1;
  }
  const scoreMax = Math.max(...scoreBuckets.map((bucket) => bucket.count), 1);

  // ── Precisione per argomento ────────────────────────────────
  const topicBuckets = new Map<string, { questions: number; correct: number }>();
  for (const row of answers) {
    const nested = row.questions;
    const topic = Array.isArray(nested) ? nested[0]?.topic : nested?.topic;
    if (!topic) continue;
    const bucket = topicBuckets.get(topic) ?? { questions: 0, correct: 0 };
    bucket.questions += 1;
    if (row.is_correct) bucket.correct += 1;
    topicBuckets.set(topic, bucket);
  }
  const topicRows = [...topicBuckets.entries()].sort(
    (a, b) => b[1].questions - a[1].questions
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Statistiche
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Dati aggregati e anonimi su utenti ed esiti dei quiz.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Aggiornato: {formatDate(new Date(now).toISOString())}
        </p>
      </header>

      {/* KPI */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Iscritti"
          value={String(totalUsers)}
          hint={`${newUsers30} nuovi negli ultimi 30 giorni`}
        />
        <KpiCard
          icon={CalendarDays}
          label="Attivi (30 gg)"
          value={String(activeUsers30)}
          hint="Utenti con almeno un quiz"
        />
        <KpiCard
          icon={BarChart3}
          label="Quiz completati"
          value={String(totalAttempts)}
          hint={`${totalQuestions} risposte totali`}
        />
        <KpiCard
          icon={Target}
          label="Precisione media"
          value={formatPercent(totalCorrect, totalQuestions)}
          hint={`${totalCorrect} risposte corrette`}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Attività */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              Attività ultimi 14 giorni
            </h2>
          </div>
          <div className="mt-5 flex h-28 items-end gap-1.5">
            {activityDays.map((day) => (
              <div
                key={day.label}
                className="group flex flex-1 flex-col items-center justify-end gap-1"
                title={`${day.count} quiz · ${day.label}`}
              >
                <span className="text-[10px] font-medium text-slate-400">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
                  style={{
                    height: `${Math.max((day.count / activityMax) * 88, 3)}px`,
                  }}
                />
                <span className="text-[9px] text-slate-400">{day.label}</span>
              </div>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-semibold text-slate-900">
            Distribuzione punteggi
          </h3>
          <ul className="mt-3 space-y-2">
            {scoreBuckets.map((bucket) => (
              <li key={bucket.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-slate-500">
                  {bucket.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{
                      width: `${Math.round((bucket.count / scoreMax) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-600">
                  {bucket.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Esiti per status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              Esiti per status
            </h2>
          </div>
          {statusRows.length === 0 ? (
            <EmptyNote text="Nessun dato disponibile." />
          ) : (
            <ul className="mt-5 space-y-4">
              {statusRows.map(([label, bucket]) => (
                <RankItem key={label} label={label} bucket={bucket} />
              ))}
            </ul>
          )}
        </div>

        {/* Città */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              Città (top 8)
            </h2>
          </div>
          {cityRows.length === 0 ? (
            <EmptyNote text="Nessun utente ha indicato la città." />
          ) : (
            <ul className="mt-5 space-y-4">
              {cityRows.map(([label, bucket]) => (
                <RankItem key={label} label={label} bucket={bucket} />
              ))}
            </ul>
          )}
        </div>

        {/* Scuole */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              Scuole / Università (top 8)
            </h2>
          </div>
          {schoolRows.length === 0 ? (
            <EmptyNote text="Nessun utente ha indicato la scuola." />
          ) : (
            <ul className="mt-5 space-y-4">
              {schoolRows.map(([label, bucket]) => (
                <RankItem key={label} label={label} bucket={bucket} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Argomenti */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold text-slate-900">
            Precisione per argomento
          </h2>
        </div>
        {topicRows.length === 0 ? (
          <EmptyNote text="Nessuna risposta registrata." />
        ) : (
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {topicRows.map(([topic, bucket]) => {
              const percent =
                bucket.questions > 0 ? bucket.correct / bucket.questions : 0;
              return (
                <li key={topic} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-xs text-slate-600 sm:w-52">
                    {topic}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        percent >= 0.7
                          ? "h-full rounded-full bg-emerald-500"
                          : percent >= 0.5
                            ? "h-full rounded-full bg-amber-500"
                            : "h-full rounded-full bg-rose-500"
                      }
                      style={{ width: `${Math.max(percent * 100, 2)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-slate-500">
                    {formatPercent(bucket.correct, bucket.questions)} ·{" "}
                    {bucket.questions}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        Nota: i dati sono mostrati esclusivamente in forma aggregata; non è
        possibile risalire al singolo utente. Gli utenti non registrati con
        almeno un quiz completato non compaiono nelle statistiche per
        argomento.
      </p>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function RankItem({ label, bucket }: { label: string; bucket: Bucket }) {
  const percent = bucket.questions > 0 ? bucket.correct / bucket.questions : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-slate-800">{label}</p>
        <p className="shrink-0 text-xs text-slate-500">
          {bucket.users.size} iscritti
          {bucket.questions > 0
            ? ` · ${formatPercent(bucket.correct, bucket.questions)}`
            : " · nessun quiz"}
        </p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={
            percent >= 0.7
              ? "h-full rounded-full bg-emerald-500"
              : percent >= 0.5
                ? "h-full rounded-full bg-amber-500"
                : "h-full rounded-full bg-rose-500"
          }
          style={{ width: `${Math.max(percent * 100, bucket.questions > 0 ? 2 : 0)}%` }}
        />
      </div>
    </li>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}
